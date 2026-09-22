const supabase = require('../../db/supabase');
const { pickCities } = require('./cityPicker');
const { pickNiches } = require('./nichePicker');
const { getConfig } = require('./autoSearchConfigService');
const { runSearch } = require('../pipeline/searchOrchestrator');
const { sleep } = require('../../utils/helpers');
const { sendXlsxToWebhook } = require('./autoSearchExporter');
const { getRunSnapshot } = require('./autoSearchRunQueries');
const runEvents = require('../../utils/runEvents');
const { requestStop, isStopRequested, clearStop } = require('./runControl');

async function countRunsToday() {
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00Z`;

  const { data, error } = await supabase
    .from('auto_search_runs')
    .select('id', { count: 'exact' })
    .gte('started_at', todayStart);

  if (error) {
    throw new Error(`Failed to count today's runs: ${error.message}`);
  }

  return data?.length || 0;
}

async function triggerRun(triggerType = 'manual') {
  const config = await getConfig();

  if (triggerType === 'scheduled' && !config.is_enabled) {
    console.log('[AutoSearchRunner] Scheduler is disabled, skipping scheduled run');
    return null;
  }

  const todayRunCount = await countRunsToday();
  const maxRunsPerDay = config.max_runs_per_day;

  if (todayRunCount >= maxRunsPerDay && triggerType === 'scheduled') {
    console.log(`[AutoSearchRunner] Daily limit of ${maxRunsPerDay} runs reached, skipping scheduled run`);
    return null;
  }

  let selectedCities = [];
  let selectedNiches = [];
  let runId = null;

  try {
    selectedCities = pickCities(config);
    selectedNiches = pickNiches(config);
  } catch (err) {
    console.error(`[AutoSearchRunner] Failed to pick cities/niches:`, err.message);
    throw err;
  }

  const totalSearches = selectedCities.length * selectedNiches.length;

  const { data: run, error: runError } = await supabase
    .from('auto_search_runs')
    .insert({
      trigger_type: triggerType,
      status: 'running',
      cities: selectedCities,
      niches: selectedNiches,
      searches_total: totalSearches,
      searches_completed: 0,
      searches_failed: 0,
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create auto_search_run: ${runError?.message}`);
  }

  runId = run.id;
  console.log(`[AutoSearchRunner] Started run ${runId}: ${selectedCities.length} cities × ${selectedNiches.length} niches = ${totalSearches} searches`);
  console.log(`[AutoSearchRunner] Cities: ${selectedCities.join(', ')}`);
  console.log(`[AutoSearchRunner] Niches: ${selectedNiches.join(', ')}`);

  executeRun(runId, config, selectedCities, selectedNiches).catch((err) => {
    console.error(`[AutoSearchRunner] Run ${runId} execution failed:`, err.message);
    supabase
      .from('auto_search_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('id', runId)
      .then(() => {
        runEvents.emitUpdate(runId, { run: { status: 'failed' } });
      });
  });

  return { runId, cities: selectedCities, niches: selectedNiches, totalSearches };
}

async function executeRun(runId, config, selectedCities, selectedNiches) {
  let completed = 0;
  let failed = 0;
  const errors = [];

  for (const city of selectedCities) {
    if (isStopRequested(runId)) {
      console.log(`[AutoSearchRunner] Stop requested for run ${runId}, breaking out of loop`);
      break;
    }

    for (const niche of selectedNiches) {
      if (isStopRequested(runId)) {
        console.log(`[AutoSearchRunner] Stop requested for run ${runId}, breaking out of inner loop`);
        break;
      }

      try {
        const { data: search, error: searchError } = await supabase
          .from('searches')
          .insert({
            query: niche,
            location: city,
            category: niche,
            status: 'processing',
            total_results: 0,
            processed_results: 0,
            website_filter: 'any',
            whatsapp_filter: 'any',
            auto_search_run_id: runId,
          })
          .select()
          .single();

        if (searchError || !search) {
          console.error(`[AutoSearchRunner] Failed to create search for "${niche}" in "${city}": ${searchError?.message}`);
          failed++;
          errors.push(`Search creation failed for ${niche} in ${city}`);
          await emitRunProgress(runId);
          continue;
        }

        try {
          console.log(`[AutoSearchRunner] Running search ${search.id}: "${niche}" in "${city}"`);
          await runSearch(
            search.id,
            niche,
            city,
            niche,
            config.results_per_search,
            'any',
            'any'
          );
          completed++;
          console.log(`[AutoSearchRunner] Completed search ${search.id}`);
        } catch (pipelineErr) {
          console.error(`[AutoSearchRunner] Pipeline failed for "${niche}" in "${city}":`, pipelineErr.message);
          await supabase
            .from('searches')
            .update({ status: 'error', error_message: pipelineErr.message })
            .eq('id', search.id);
          failed++;
          errors.push(`Pipeline failed for ${niche} in ${city}: ${pipelineErr.message}`);
        }

        await emitRunProgress(runId);
        await sleep(500);
      } catch (err) {
        console.error(`[AutoSearchRunner] Error in search loop for "${niche}" in "${city}":`, err.message);
        failed++;
        errors.push(`Loop error for ${niche} in ${city}: ${err.message}`);
        await emitRunProgress(runId);
      }
    }
  }

  const totalSearches = selectedCities.length * selectedNiches.length;
  const isCancelled = isStopRequested(runId);
  const finalStatus = isCancelled ? 'cancelled' : (errors.length === 0 ? 'completed' : 'completed_with_errors');
  const finalErrorMessage = errors.length > 0 ? errors.slice(0, 5).join('; ') : null;

  const { error: updateError } = await supabase
    .from('auto_search_runs')
    .update({
      status: finalStatus,
      searches_completed: completed,
      searches_failed: failed,
      error_message: finalErrorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (updateError) {
    console.error(`[AutoSearchRunner] Failed to update run ${runId} status:`, updateError.message);
  }

  clearStop(runId);
  console.log(`[AutoSearchRunner] Run ${runId} finished: ${completed}/${totalSearches} completed, ${failed} failed, status: ${finalStatus}`);

  await emitRunProgress(runId);

  (async () => {
    try {
      await sendXlsxToWebhook(runId);
    } catch (err) {
      console.error(`[AutoSearchRunner] Failed to send webhook for run ${runId}:`, err.message);
    }
  })();
}

async function emitRunProgress(runId) {
  try {
    const snapshot = await getRunSnapshot(runId);
    if (snapshot) {
      runEvents.emitUpdate(runId, snapshot);
    }
  } catch (err) {
    console.error(`[AutoSearchRunner] Failed to emit progress for run ${runId}:`, err.message);
  }
}

module.exports = { triggerRun, countRunsToday };
