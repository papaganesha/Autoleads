#!/usr/bin/env node
const supabase = require('../src/db/supabase');
const logger = require('../src/utils/logger');

async function backfillLeadCategory() {
  logger.info('[Backfill] Starting category backfill for leads with null category...');

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, search_id, category')
    .is('category', null);

  if (leadsError) throw new Error(`Failed to fetch leads: ${leadsError.message}`);

  if (!leads?.length) {
    logger.info('[Backfill] No leads with null category found.');
    return;
  }

  logger.info(`[Backfill] Found ${leads.length} leads with null category.`);

  const searchIds = [...new Set(leads.map(l => l.search_id).filter(Boolean))];
  const { data: searches, error: searchesError } = await supabase
    .from('searches').select('id, category').in('id', searchIds);

  if (searchesError) throw new Error(`Failed to fetch searches: ${searchesError.message}`);

  const map = Object.fromEntries((searches || []).map(s => [s.id, s.category]));
  let updated = 0, skipped = 0;

  for (const lead of leads) {
    const category = lead.search_id ? map[lead.search_id] : null;
    if (!category) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from('leads').update({ category }).eq('id', lead.id);
    if (error) {
      logger.warn(`[Backfill] Lead ${lead.id}: ${error.message}`);
      skipped++;
    } else {
      updated++;
      if (updated % 100 === 0) logger.info(`[Backfill] Progress: ${updated} updated, ${skipped} skipped...`);
    }
  }

  logger.info(`[Backfill] Done. Updated: ${updated}, Skipped: ${skipped}, Total: ${leads.length}`);
}

backfillLeadCategory()
  .then(() => process.exit(0))
  .catch(err => {
    logger.error(`[Backfill] Fatal error: ${err.message}`);
    process.exit(1);
  });
