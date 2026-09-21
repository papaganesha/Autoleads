#!/usr/bin/env node

/**
 * Script to fix historical leads where "website" is actually a social media URL.
 *
 * This script:
 * 1. Finds leads where website matches social media patterns
 * 2. Zeros the website field
 * 3. Re-runs Instagram and Facebook discovery with the raw URL as signal
 * 4. Re-scores the lead
 *
 * Run: node scripts/fixWebsiteInstagramConflation.js
 * (optionally with LIMIT=10 NODE_ENV=production)
 */

const supabase = require('../src/db/supabase');
const instagram = require('../src/services/instagram');
const facebook = require('../src/services/facebook');
const scoring = require('../src/services/scoring');
const { isValidWebsite } = require('../src/utils/helpers');

const BATCH_SIZE = 5;
const LIMIT = parseInt(process.env.LIMIT, 10) || 100; // Max leads to fix per run
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry-run unless explicitly disabled

(async () => {
  console.log(`[Cleanup] Starting website/Instagram conflation fix (DRY_RUN=${DRY_RUN}, LIMIT=${LIMIT})`);

  try {
    // 1. Find affected leads: website exists but is not a valid website
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .not('website', 'is', null)
      .limit(LIMIT);

    if (fetchError) {
      console.error('[Cleanup] Error fetching leads:', fetchError.message);
      process.exit(1);
    }

    if (!leads || leads.length === 0) {
      console.log('[Cleanup] No leads found to process.');
      process.exit(0);
    }

    // 2. Filter to only those with invalid websites (social media URLs)
    const affectedLeads = leads.filter(l => !isValidWebsite(l.website));

    if (affectedLeads.length === 0) {
      console.log('[Cleanup] No leads with conflated website/Instagram found.');
      process.exit(0);
    }

    console.log(`[Cleanup] Found ${affectedLeads.length} leads with conflated website/Instagram fields`);

    let fixed = 0;

    // 3. Process in batches
    for (let i = 0; i < affectedLeads.length; i += BATCH_SIZE) {
      const batch = affectedLeads.slice(i, i + BATCH_SIZE);

      for (const lead of batch) {
        try {
          console.log(`[Cleanup] Processing lead ${lead.id}: ${lead.name} (old website: ${lead.website})`);

          const rawWebsiteUri = lead.website;

          if (DRY_RUN) {
            console.log(`[Cleanup] DRY_RUN: Would zero website, re-discover Instagram/Facebook from: ${rawWebsiteUri}`);
            continue;
          }

          // 4a. Zero the website field
          await supabase
            .from('leads')
            .update({ website: null })
            .eq('id', lead.id);

          lead.website = null; // Update in-memory for scoring

          // 4b. Re-discover Instagram with raw URL as signal
          const instagramData = await instagram.scrapeInstagram(lead.id, rawWebsiteUri, lead.name);
          if (instagramData?.handle) {
            console.log(`[Cleanup] Rediscovered Instagram: ${instagramData.handle}`);
          }

          // 4c. Re-discover Facebook with raw URL as signal
          const facebookUrl = await facebook.findFacebook(lead.id, rawWebsiteUri);
          if (facebookUrl) {
            console.log(`[Cleanup] Rediscovered Facebook: ${facebookUrl}`);
          }

          // 4d. Re-score the lead
          const newScore = await scoring.scoreAndSave(lead.id, lead, instagramData, []);
          console.log(`[Cleanup] Rescored: ${newScore.temperature} (${newScore.totalScore} pts)`);

          fixed++;
        } catch (err) {
          console.error(`[Cleanup] Error processing lead ${lead.id}:`, err.message);
        }
      }
    }

    console.log(`[Cleanup] Complete. Fixed ${fixed}/${affectedLeads.length} leads.`);
    if (DRY_RUN) {
      console.log('[Cleanup] DRY_RUN mode: no changes were made. Run with DRY_RUN=false to apply fixes.');
    }
    process.exit(0);
  } catch (err) {
    console.error('[Cleanup] Fatal error:', err.message);
    process.exit(1);
  }
})();
