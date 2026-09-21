const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const googleMaps = require('../services/googleMaps');
const instagram = require('../services/instagram');
const facebook = require('../services/facebook');
const competitors = require('../services/competitors');
const scoring = require('../services/scoring');
const copyGenerator = require('../services/copyGenerator');
const discord = require('../services/discord');
const { sleep, isValidWebsite } = require('../utils/helpers');
const searchEvents = require('../utils/searchEvents');
const { logAudit } = require('../utils/auditLog');

/**
 * GET /api/search/autocomplete
 * Get location suggestions.
 */
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { input } = req.query;
    if (!input || !input.trim()) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await googleMaps.autocompletePlaces(input);
    return res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/search
 * Start a new search pipeline. Returns immediately with searchId;
 * processing continues in the background.
 */
router.post('/', async (req, res, next) => {
  try {
    const { query, location, category, limit, websiteFilter = 'any', whatsappFilter = 'any' } = req.body;

    console.log('[Search] POST /api/search body:', JSON.stringify(req.body));

    // Validate required fields: non-empty, trimmed, and within length limits
    const MAX_LOCATION_LENGTH = 100;
    const MAX_QUERY_LENGTH = 100;

    const trimmedLocation = location && String(location).trim();
    if (!trimmedLocation) {
      return res.status(400).json({ error: 'location is required and cannot be empty' });
    }
    if (trimmedLocation.length > MAX_LOCATION_LENGTH) {
      return res.status(400).json({ error: `location cannot exceed ${MAX_LOCATION_LENGTH} characters` });
    }

    // Build the query: use explicit query, or derive from category
    const trimmedQuery = query && String(query).trim();
    const trimmedCategory = category && String(category).trim();
    const searchQuery = trimmedQuery || trimmedCategory || '';

    if (!searchQuery) {
      return res.status(400).json({ error: 'query or category is required and cannot be empty' });
    }
    if (searchQuery.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({ error: `query/category cannot exceed ${MAX_QUERY_LENGTH} characters` });
    }

    // Validate filter enums
    const validFilterValues = ['any', 'with', 'without'];
    if (!validFilterValues.includes(websiteFilter)) {
      return res.status(400).json({ error: 'websiteFilter must be one of: any, with, without' });
    }
    if (!validFilterValues.includes(whatsappFilter)) {
      return res.status(400).json({ error: 'whatsappFilter must be one of: any, with, without' });
    }

    // Clamp limit to 10-15, default 10 (minimum 10 to ensure quality enrichment)
    const resultLimit = Math.min(15, Math.max(10, parseInt(limit, 10) || 10));

    // Create search record
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        query: searchQuery,
        location: trimmedLocation,
        category: trimmedCategory || searchQuery,
        status: 'processing',
        total_results: 0,
        processed_results: 0,
        website_filter: websiteFilter,
        whatsapp_filter: whatsappFilter,
      })
      .select()
      .single();

    if (searchError) {
      throw new Error(`Failed to create search: ${searchError.message}`);
    }

    // Start pipeline in background (do not await)
    (async () => {
      try {
        await runPipeline(search.id, searchQuery, location, category, resultLimit, websiteFilter, whatsappFilter);
      } catch (err) {
        console.error(`[Search Pipeline] Fatal error for search ${search.id}:`, err.message);
        await updateSearch(search.id, { status: 'error', error_message: err.message });
      }
    })();

    return res.status(201).json({
      searchId: search.id,
      status: 'processing',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/:id
 * Returns search status and progress.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: search, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    return res.json(search);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/:id/events
 * Server-Sent Events endpoint for real-time search progress updates.
 */
router.get('/:id/events', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch current search state first (404 as JSON before any SSE headers)
    const { data: search, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Send SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial state
    res.write(`data: ${JSON.stringify(search)}\n\n`);

    // Subscribe to updates for this search
    const unsubscribe = searchEvents.subscribe(id, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    // Unsubscribe when client closes
    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/:id/leads
 * Returns leads for a search with joined data.
 * Supports ?temperature= filter, ?website= (with/without), ?whatsapp= (with/without), and ?limit= (5-20, default 10).
 */
router.get('/:id/leads', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { temperature, website, whatsapp, limit = '10' } = req.query;

    const limitNum = Math.min(20, Math.max(5, parseInt(limit, 10) || 10));

    let query = supabase
      .from('leads')
      .select('*, instagram_data(*), lead_scores(*), copy_variations(*)')
      .eq('search_id', id)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    // Apply website and whatsapp filters at DB level
    if (website === 'with') {
      query = query.not('website', 'is', null);
    } else if (website === 'without') {
      query = query.is('website', null);
    }

    if (whatsapp === 'with') {
      query = query.not('phone', 'is', null);
    } else if (whatsapp === 'without') {
      query = query.is('phone', null);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    let results = leads || [];

    // Filter by temperature if requested (in-memory, for now)
    if (temperature) {
      results = results.filter((lead) => {
        const score = Array.isArray(lead.lead_scores)
          ? lead.lead_scores[0]
          : lead.lead_scores;
        return score?.temperature === temperature;
      });
    }

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * Update search state in DB and broadcast via SSE.
 */
async function updateSearch(searchId, patch) {
  const { data, error } = await supabase
    .from('searches')
    .update(patch)
    .eq('id', searchId)
    .select()
    .single();

  if (!error && data) {
    searchEvents.emitUpdate(searchId, data);
  }

  return { data, error };
}

/**
 * Filter a place by website and whatsapp presence.
 * Returns true if the place matches the requested filters.
 */
function matchesFilters(place, websiteFilter, whatsappFilter) {
  const hasValidWebsite = !!place.websiteUri && isValidWebsite(place.websiteUri);
  const hasPhone = !!place.internationalPhoneNumber;

  if (websiteFilter === 'with' && !hasValidWebsite) return false;
  if (websiteFilter === 'without' && hasValidWebsite) return false;
  if (whatsappFilter === 'with' && !hasPhone) return false;
  if (whatsappFilter === 'without' && hasPhone) return false;

  return true;
}

/**
 * Prioritize places for enrichment: places without website come first (higher opportunity for digital transformation).
 * This ensures we focus our API quota on the most valuable leads.
 */
function prioritizePlacesForEnrichment(places) {
  return places.sort((a, b) => {
    const aHasWebsite = !!a.websiteUri && isValidWebsite(a.websiteUri);
    const bHasWebsite = !!b.websiteUri && isValidWebsite(b.websiteUri);
    // Places without valid websites come first
    if (aHasWebsite !== bHasWebsite) return aHasWebsite ? 1 : -1;
    // Tie-breaker: rating (higher rating = more established)
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * The main search & enrichment pipeline.
 * Runs sequentially for each place found.
 */
async function runPipeline(searchId, query, location, category, resultLimit = 10, websiteFilter = 'any', whatsappFilter = 'any') {
  console.log(`[Pipeline] Starting for search ${searchId}: "${query}" in "${location}" (limit: ${resultLimit}, website: ${websiteFilter}, whatsapp: ${whatsappFilter})`);

  // Resolve category with fallback to query (same logic as searches.category)
  const trimmedCategory = category && String(category).trim();
  const resolvedCategory = trimmedCategory || query;

  // Step 1: Google Maps Text Search (fetches up to 2 pages, ~40 places)
  const allPlaces = await googleMaps.textSearch(query, location);

  // Step 1b: Dedup — check which places are already in the database
  const placeIds = allPlaces.map(p => p.id);
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('place_id')
    .in('place_id', placeIds);
  const knownPlaceIds = new Set((existingLeads || []).map(l => l.place_id));

  // Split into new (need full enrichment) and known (skip enrichment)
  const newPlaces = allPlaces.filter(p => !knownPlaceIds.has(p.id));
  const knownPlaces = allPlaces.filter(p => knownPlaceIds.has(p.id));

  // Apply content filters BEFORE slicing, using data Google Maps already provided
  const filteredNewPlaces = newPlaces.filter(p => matchesFilters(p, websiteFilter, whatsappFilter));
  const filteredKnownPlaces = knownPlaces.filter(p => matchesFilters(p, websiteFilter, whatsappFilter));

  // Prioritize places without website for enrichment (highest opportunity for digital transformation)
  const prioritizedNew = prioritizePlacesForEnrichment(filteredNewPlaces);
  const prioritizedKnown = prioritizePlacesForEnrichment(filteredKnownPlaces);

  // Slice to fill the requested limit: prioritize filtered new places, then top up with filtered known
  const toEnrich = prioritizedNew.slice(0, resultLimit);
  const toLink = prioritizedKnown.slice(0, Math.max(0, resultLimit - toEnrich.length));
  const places = toEnrich.concat(toLink);

  console.log(`[Pipeline] Dedup: ${allPlaces.length} total, ${newPlaces.length} new, ${knownPlaces.length} known; filtered: ${filteredNewPlaces.length} new, ${filteredKnownPlaces.length} known; enriching ${toEnrich.length}, linking ${toLink.length}`);

  // Update total_results (what we're actually processing)
  await updateSearch(searchId, { total_results: places.length });

  if (places.length === 0) {
    await updateSearch(searchId, { status: 'completed', total_results: 0, processed_results: 0 });
    return;
  }

  let processed = 0;

  for (const place of places) {
    const isNew = toEnrich.some(p => p.id === place.id);

    try {
      // Step 2: Upsert lead
      const rawWebsiteUri = place.websiteUri || null;
      const validWebsite = rawWebsiteUri && isValidWebsite(rawWebsiteUri) ? rawWebsiteUri : null;

      const leadData = {
        search_id: searchId,
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || null,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        phone: place.internationalPhoneNumber || null,
        website: validWebsite,
        google_maps_url: place.googleMapsUri || null,
        rating: place.rating || null,
        user_rating_count: place.userRatingCount || 0,
        category: resolvedCategory,
        status: 'new',
      };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'place_id' })  // Upsert on place_id UNIQUE constraint
        .select()
        .single();

      if (leadError || !lead) {
        console.error(`[Pipeline] Failed to upsert lead: ${leadError?.message}`);
        processed++;
        await updateSearch(searchId, { processed_results: processed });
        continue;
      }

      // Log lead creation or linkage
      if (isNew) {
        await logAudit('lead_created', lead.id, { place_id: lead.place_id }, 'system');
      } else {
        await logAudit('lead_linked_existing', lead.id, { place_id: lead.place_id }, 'system');
      }

      // Update search_id in case the lead already existed from another search
      if (lead.search_id !== searchId) {
        await supabase
          .from('leads')
          .update({ search_id: searchId })
          .eq('id', lead.id);
      }

      // Only enrich new places (skip Instagram, competitors, scoring, copy, Discord for known leads)
      if (isNew) {
        let enrichmentFailed = false;
        let instagramData = null;
        let nearbyCompetitors = [];
        let score = null;

        // Step 3: Scrape Instagram (with error handling)
        try {
          instagramData = await instagram.scrapeInstagram(lead.id, rawWebsiteUri, lead.name, place.id, place.googleMapsUri);
          if (instagramData?.handle) {
            await logAudit('enriched_instagram', lead.id, {
              handle: instagramData.handle,
              followers: instagramData.followers_count,
            }, 'system');
          }

          // Cross-fill phone from Instagram bio if Maps phone is absent
          if (instagramData?.bio_phone && !lead.phone) {
            await supabase
              .from('leads')
              .update({ phone: instagramData.bio_phone })
              .eq('id', lead.id);
            lead.phone = instagramData.bio_phone; // Update in-memory for scoring
            await logAudit('phone_filled_from_instagram_bio', lead.id, {
              source: 'instagram_bio',
              phone: instagramData.bio_phone,
            }, 'system');
          }
        } catch (igErr) {
          console.error(`[Pipeline] Instagram scrape failed for lead ${lead.id}:`, igErr.message);
          await supabase
            .from('instagram_data')
            .upsert({
              lead_id: lead.id,
              handle: null,
              scrape_status: 'failed',
              error_message: igErr.message,
            }, { onConflict: 'lead_id' });
          enrichmentFailed = true;
        }

        // Step 3.5: Find Facebook URL (with error handling)
        try {
          const facebookUrl = await facebook.findFacebook(lead.id, rawWebsiteUri);
          if (facebookUrl) {
            await logAudit('enriched_facebook', lead.id, { facebook_url: facebookUrl }, 'system');
          }
        } catch (fbErr) {
          console.error(`[Pipeline] Facebook discovery failed for lead ${lead.id}:`, fbErr.message);
        }

        // Step 4: Find competitors — DISABLED to preserve Maps API quota
        // nearbyCompetitors search was consuming 1 quota unit per lead
        // Scoring still works without competitors data

        // Step 5: Score the lead (with error handling)
        try {
          score = await scoring.scoreAndSave(lead.id, lead, instagramData, nearbyCompetitors);
          await logAudit('scored', lead.id, {
            total_score: score.totalScore,
            temperature: score.temperature,
          }, 'system');
        } catch (scoreErr) {
          console.error(`[Pipeline] Scoring failed for lead ${lead.id}:`, scoreErr.message);
          await supabase
            .from('lead_scores')
            .upsert({
              lead_id: lead.id,
              temperature: 'cold',
              total_score: 0,
              score_breakdown: { error: scoreErr.message },
            }, { onConflict: 'lead_id' });
          enrichmentFailed = true;
        }

        // Step 6: Generate copy variations (with error handling)
        if (score) {
          try {
            await copyGenerator.generateCopyVariations(lead, instagramData, nearbyCompetitors, score);
          } catch (copyErr) {
            console.error(`[Pipeline] Copy generation failed for lead ${lead.id}:`, copyErr.message);
            await supabase
              .from('copy_variations')
              .upsert({
                lead_id: lead.id,
                pain_point: null,
                social_proof: null,
                urgency: null,
                value: null,
                generated_at: new Date().toISOString(),
              }, { onConflict: 'lead_id' });
            enrichmentFailed = true;
          }
        }

        // Step 7: Notify if hot (only if scoring succeeded)
        if (score && score.temperature === 'hot' && !enrichmentFailed) {
          try {
            await discord.sendHotLeadNotification(lead, score, instagramData);
          } catch (discordErr) {
            console.warn(`[Pipeline] Discord notification failed for lead ${lead.id}:`, discordErr.message);
            // Don't mark as failed — notification is non-critical
          }
        }

        // Mark lead status based on enrichment outcome
        if (enrichmentFailed) {
          await supabase
            .from('leads')
            .update({ status: 'enrichment_failed' })
            .eq('id', lead.id);
          console.log(`[Pipeline] Lead ${lead.id} enrichment failed, marked as enrichment_failed`);
        }
      } else {
        console.log(`[Pipeline] Skipping enrichment for known place ${place.id} (${place.displayName?.text})`);
      }

      // Update progress and broadcast
      processed++;
      await updateSearch(searchId, { processed_results: processed });

      // Small delay to avoid rate limiting
      await sleep(500);
    } catch (err) {
      console.error(`[Pipeline] Error processing place ${place.displayName?.text}:`, err.message);
      processed++;
      await updateSearch(searchId, { processed_results: processed });
    }
  }

  // Mark search as completed
  await updateSearch(searchId, { status: 'completed' });

  console.log(`[Pipeline] Completed search ${searchId}: ${processed}/${places.length} processed`);
}

router.runPipeline = runPipeline;

module.exports = router;
