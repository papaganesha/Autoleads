#!/usr/bin/env node

const supabase = require('../src/db/supabase');
const scoring = require('../src/services/scoring');
const logger = require('../src/logger');

async function rescoreAllLeads() {
  try {
    logger.info('Starting rescore of all leads...');

    // Fetch all leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, website, user_rating_count, rating, phone');

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    if (!leads || leads.length === 0) {
      logger.info('No leads found to rescore.');
      return;
    }

    logger.info(`Found ${leads.length} leads. Fetching Instagram data...`);

    // Fetch all Instagram data
    const { data: instagramDataList, error: igError } = await supabase
      .from('instagram_data')
      .select('lead_id, followers_count, posts_count');

    if (igError) {
      throw new Error(`Failed to fetch Instagram data: ${igError.message}`);
    }

    // Build a map for O(1) lookup
    const instagramMap = {};
    if (instagramDataList) {
      instagramDataList.forEach((ig) => {
        instagramMap[ig.lead_id] = ig;
      });
    }

    let rescored = 0;
    let skipped = 0;

    // Rescore each lead
    for (const lead of leads) {
      const instagramData = instagramMap[lead.id] || null;

      try {
        // Call scoreAndSave with empty competitors array (already disabled)
        await scoring.scoreAndSave(lead.id, lead, instagramData, []);
        rescored++;
      } catch (err) {
        logger.warn(`Failed to rescore lead ${lead.id}: ${err.message}`);
        skipped++;
      }
    }

    logger.info(
      `Rescore complete. Rescored: ${rescored}, Skipped: ${skipped}, Total: ${leads.length}`
    );
  } catch (err) {
    logger.error(`Fatal error during rescore: ${err.message}`);
    process.exit(1);
  }
}

rescoreAllLeads().then(() => {
  process.exit(0);
});
