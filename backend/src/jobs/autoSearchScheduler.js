const cron = require('node-cron');
const supabase = require('../db/supabase');
const logger = require('../utils/logger');
const { triggerRun } = require('../services/scheduler/autoSearchRunner');

function startAutoSearchScheduler() {
  const schedule = process.env.AUTO_SEARCH_CHECK_CRON || '*/5 * * * *';

  const task = cron.schedule(schedule, async () => {
    logger.info('[AutoSearchScheduler] Checking if a scheduled run is due');

    try {
      const { data: config, error: configError } = await supabase
        .from('auto_search_config')
        .select('*')
        .single();

      if (configError || !config) {
        logger.warn('[AutoSearchScheduler] Failed to fetch config');
        return;
      }

      if (!config.is_enabled) {
        logger.debug('[AutoSearchScheduler] Scheduler is disabled, skipping');
        return;
      }

      if (!config.schedule_times || config.schedule_times.length === 0) {
        logger.debug('[AutoSearchScheduler] No schedule times configured');
        return;
      }

      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      // Check if current time matches exactly
      const isDueNow = config.schedule_times.includes(currentTime);

      if (!isDueNow) {
        logger.debug(`[AutoSearchScheduler] Current time ${currentTime} not in schedule`);
        return;
      }

      const today = now.toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00Z`;

      const { data: todayRuns, error: countError } = await supabase
        .from('auto_search_runs')
        .select('id', { count: 'exact' })
        .gte('started_at', todayStart)
        .eq('trigger_type', 'scheduled');

      if (countError) {
        logger.warn('[AutoSearchScheduler] Failed to count today\'s runs:', countError.message);
        return;
      }

      const runCountToday = todayRuns?.length || 0;

      if (runCountToday > 0) {
        logger.info(`[AutoSearchScheduler] Already ran ${runCountToday} time(s) at ${currentTime} today, skipping duplicate`);
        return;
      }

      logger.info(`[AutoSearchScheduler] Time slot ${currentTime} is due, triggering run`);
      await triggerRun('scheduled');
    } catch (err) {
      logger.error('[AutoSearchScheduler] Fatal error:', err.message);
    }
  });

  logger.info(`[AutoSearchScheduler] Started with schedule: ${schedule}`);
  return task;
}

module.exports = { startAutoSearchScheduler };
