const supabase = require('../db/supabase');
const googleMaps = require('../services/googleMaps');
const instagram = require('../services/instagram');
const competitors = require('../services/competitors');
const scoring = require('../services/scoring');
const copyGenerator = require('../services/copyGenerator');
const discord = require('../services/discord');
const logger = require('../utils/logger');
const { sleep } = require('../utils/helpers');

/**
 * GET /api/search/autocomplete
 * Get location suggestions.
 */
async function autocomplete(req, res, next) {
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
}

/**
 * POST /api/search
 * Start a new search pipeline. Returns immediately with searchId.
 */
async function startSearch(req, res, next) {
  try {
    const { query, location, category } = req.body;

    const searchQuery = query || category || '';
    if (!searchQuery && !location) {
      return res.status(400).json({ error: 'query or category is required' });
    }

    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        query: searchQuery,
        location: location || null,
        category: category || null,
        status: 'processing',
        total_results: 0,
        processed_results: 0,
      })
      .select()
      .single();

    if (searchError) {
      throw new Error(`Failed to create search: ${searchError.message}`);
    }

    // Start pipeline in background
    (async () => {
      try {
        await runPipeline(search.id, searchQuery, location, category);
      } catch (err) {
        logger.error({ err }, `[Search Pipeline] Fatal error for search ${search.id}: ${err.message}`);
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
}

/**
 * GET /api/search/:id
 * Returns search status and progress.
 */
async function getSearchStatus(req, res, next) {
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
}

/**
 * GET /api/search/:id/leads
 * Returns leads for a search with joined data.
 */
async function getSearchLeads(req, res, next) {
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

/**
 * Background lead search and enrichment pipeline.
 */
async function runPipeline(searchId, query, location, category) {
  logger.info(`[Pipeline] Starting for search ${searchId}: "${query}" in "${location}"`);

  // Step 1: Google Maps Text Search
  const places = await googleMaps.textSearch(query, location);

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
        logger.error(`[Pipeline] Failed to upsert lead: ${leadError?.message}`);
        continue;
      }

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

      processed++;
      await supabase
        .from('searches')
        .update({ processed_results: processed })
        .eq('id', searchId);

      await sleep(500);
    } catch (err) {
      logger.error({ err }, `[Pipeline] Error processing place ${place.displayName?.text}: ${err.message}`);
      processed++;
      await supabase
        .from('searches')
        .update({ processed_results: processed })
        .eq('id', searchId);
    }
  }

  await supabase
    .from('searches')
    .update({ status: 'completed' })
    .eq('id', searchId);

  logger.info(`[Pipeline] Completed search ${searchId}: ${processed}/${places.length} processed`);
}

module.exports = {
  autocomplete,
  startSearch,
  getSearchStatus,
  getSearchLeads,
  runPipeline,
};

  }
}
