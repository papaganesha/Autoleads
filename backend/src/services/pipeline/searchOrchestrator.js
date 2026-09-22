const { fetchPlaces } = require('./placesFetcher');
const { deduplicateAndFilter } = require('./leadDeduplicator');
const { upsertLead, logLeadEvent, updateSearchIdIfNeeded } = require('./leadRepository');
const { enrichLead } = require('./enrichmentService');
const { updateProgress } = require('./progressReporter');
const { sleep } = require('../../utils/helpers');

async function runSearch(searchId, query, location, category, resultLimit = 10, websiteFilter = 'any', whatsappFilter = 'any') {
  console.log(`[SearchOrchestrator] Starting for search ${searchId}: "${query}" in "${location}" (limit: ${resultLimit}, website: ${websiteFilter}, whatsapp: ${whatsappFilter})`);

  try {
    const allPlaces = await fetchPlaces(query, location);

    const { finalPlaces, toEnrich, stats } = await deduplicateAndFilter(
      allPlaces,
      websiteFilter,
      whatsappFilter,
      resultLimit
    );

    console.log(`[SearchOrchestrator] Dedup: total=${stats.total}, new=${stats.newCount}, known=${stats.knownCount}, filtered_new=${stats.filteredNewCount}, filtered_known=${stats.filteredKnownCount}, to_enrich=${stats.toEnrichCount}, to_link=${stats.toLinkCount}`);

    await updateProgress(searchId, { total_results: finalPlaces.length });

    if (finalPlaces.length === 0) {
      await updateProgress(searchId, { status: 'completed', total_results: 0, processed_results: 0 });
      return;
    }

    let processed = 0;

    for (const place of finalPlaces) {
      const isNew = toEnrich.some(p => p.id === place.id);

      try {
        const { lead, rawWebsiteUri } = await upsertLead(place, searchId, category, query);

        await logLeadEvent(lead, isNew, place.id);
        await updateSearchIdIfNeeded(lead.id, searchId);

        if (isNew) {
          await enrichLead(lead, rawWebsiteUri);
        } else {
          console.log(`[SearchOrchestrator] Skipping enrichment for known place ${place.id} (${place.displayName?.text})`);
        }

        processed++;
        await updateProgress(searchId, { processed_results: processed });

        await sleep(500);
      } catch (err) {
        console.error(`[SearchOrchestrator] Error processing place ${place.displayName?.text}:`, err.message);
        processed++;
        await updateProgress(searchId, { processed_results: processed });
      }
    }

    await updateProgress(searchId, { status: 'completed' });
    console.log(`[SearchOrchestrator] Completed search ${searchId}: ${processed}/${finalPlaces.length} processed`);
  } catch (err) {
    console.error(`[SearchOrchestrator] Fatal error for search ${searchId}:`, err.message);
    throw err;
  }
}

module.exports = { runSearch };
