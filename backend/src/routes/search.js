const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const googleMaps = require('../services/googleMaps');
const instagram = require('../services/instagram');
const competitors = require('../services/competitors');
const scoring = require('../services/scoring');
const copyGenerator = require('../services/copyGenerator');
const discord = require('../services/discord');
const { sleep } = require('../utils/helpers');

/**
 * POST /api/search
 * Start a new search pipeline. Returns immediately with searchId;
 * processing continues in the background.
 */
router.post('/', async (req, res, next) => {
  try {
    const { query, location, category } = req.body;

    console.log('[Search] POST /api/search body:', JSON.stringify(req.body));

    // Validate required fields
    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    // Build the query: use explicit query, or derive from category
    const searchQuery = query || category || '';
    if (!searchQuery) {
      return res.status(400).json({ error: 'query or category is required' });
    }

    // Create search record
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        query: searchQuery,
        location,
        category: category || searchQuery,
        status: 'processing',
        total_results: 0,
        processed_results: 0,
      })
      .select()
      .single();

    if (searchError) {
      throw new Error(`Failed to create search: ${searchError.message}`);
    }

    // Start pipeline in background (do not await)
    (async () => {
      try {
        await runPipeline(search.id, searchQuery, location, category);
      } catch (err) {
        console.error(`[Search Pipeline] Fatal error for search ${search.id}:`, err.message);
        await supabase
          .from('searches')
          .update({ status: 'error', error_message: err.message })
          .eq('id', search.id);
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
 * GET /api/search/:id/leads
 * Returns leads for a search with joined data.
 * Supports ?temperature= filter.
 */
router.get('/:id/leads', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { temperature } = req.query;

    let query = supabase
      .from('leads')
      .select('*, instagram_data(*), lead_scores(*), copy_variations(*)')
      .eq('search_id', id)
      .order('created_at', { ascending: false });

    const { data: leads, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    let results = leads || [];

    // Filter by temperature if requested
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
 * The main search & enrichment pipeline.
 * Runs sequentially for each place found.
 */
async function runPipeline(searchId, query, location, category) {
  console.log(`[Pipeline] Starting for search ${searchId}: "${query}" in "${location}"`);

  // Step 1: Google Maps Text Search
  const places = await googleMaps.textSearch(query, location);

  // Update total_results
  await supabase
    .from('searches')
    .update({ total_results: places.length })
    .eq('id', searchId);

  if (places.length === 0) {
    await supabase
      .from('searches')
      .update({ status: 'completed', total_results: 0, processed_results: 0 })
      .eq('id', searchId);
    return;
  }

  let processed = 0;

  for (const place of places) {
    try {
      // Step 2: Upsert lead
      const leadData = {
        search_id: searchId,
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || null,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        phone: place.internationalPhoneNumber || null,
        website: place.websiteUri || null,
        google_maps_url: place.googleMapsUri || null,
        rating: place.rating || null,
        user_rating_count: place.userRatingCount || 0,
        category: category || null,
        status: 'new',
      };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'place_id' })
        .select()
        .single();

      if (leadError || !lead) {
        console.error(`[Pipeline] Failed to upsert lead: ${leadError?.message}`);
        continue;
      }

      // Update search_id in case the lead already existed from another search
      if (lead.search_id !== searchId) {
        await supabase
          .from('leads')
          .update({ search_id: searchId })
          .eq('id', lead.id);
      }

      // Step 3: Scrape Instagram
      const instagramData = await instagram.scrapeInstagram(lead.id, lead.website);

      // Step 4: Find competitors
      const nearbyCompetitors = await competitors.findNearby(lead, category);

      // Step 5: Score the lead
      const score = await scoring.scoreAndSave(lead.id, lead, instagramData, nearbyCompetitors);

      // Step 6: Generate copy variations
      await copyGenerator.generateCopyVariations(lead, instagramData, nearbyCompetitors, score);

      // Step 7: Notify if hot
      if (score.temperature === 'hot') {
        await discord.sendHotLeadNotification(lead, score);
      }

      // Update progress
      processed++;
      await supabase
        .from('searches')
        .update({ processed_results: processed })
        .eq('id', searchId);

      // Small delay to avoid rate limiting
      await sleep(500);
    } catch (err) {
      console.error(`[Pipeline] Error processing place ${place.displayName?.text}:`, err.message);
      processed++;
      await supabase
        .from('searches')
        .update({ processed_results: processed })
        .eq('id', searchId);
    }
  }

  // Mark search as completed
  await supabase
    .from('searches')
    .update({ status: 'completed' })
    .eq('id', searchId);

  console.log(`[Pipeline] Completed search ${searchId}: ${processed}/${places.length} processed`);
}

module.exports = router;
