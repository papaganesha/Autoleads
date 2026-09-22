const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { getConfig, updateConfig, toggleEnabled } = require('../services/scheduler/autoSearchConfigService');
const { triggerRun } = require('../services/scheduler/autoSearchRunner');
const { exportRunResultsToXlsx } = require('../services/scheduler/autoSearchExporter');

/**
 * GET /api/auto-search/config
 * Returns the current scheduler configuration.
 */
router.get('/config', async (req, res, next) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auto-search/config
 * Updates the scheduler configuration.
 */
router.put('/config', async (req, res, next) => {
  try {
    const updated = await updateConfig(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auto-search/pause
 * Disables the scheduler.
 */
router.post('/pause', async (req, res, next) => {
  try {
    const config = await toggleEnabled(false);
    res.json({
      message: 'Scheduler paused',
      ...config,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auto-search/resume
 * Enables the scheduler.
 */
router.post('/resume', async (req, res, next) => {
  try {
    const config = await toggleEnabled(true);
    res.json({
      message: 'Scheduler resumed',
      ...config,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auto-search/run
 * Manually triggers an auto-search run.
 */
router.post('/run', async (req, res, next) => {
  try {
    const result = await triggerRun('manual');
    res.status(201).json({
      message: `Auto-search run started with ${result.searches.length} searches`,
      runId: result.runId,
      totalSearches: result.searches.length,
      cities: result.cities,
      niches: result.niches,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auto-search/runs
 * Retrieves paginated list of auto-search runs.
 */
router.get('/runs', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const { data: runs, error } = await supabase
      .from('auto_search_runs')
      .select('id, trigger_type, status, cities, niches, searches_total, searches_completed, searches_failed, started_at, finished_at')
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      data: runs || [],
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auto-search/runs/:runId
 * Retrieves detailed info about a specific run with its searches.
 */
router.get('/runs/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;

    const { data: run, error: runError } = await supabase
      .from('auto_search_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const { data: searches, error: searchesError } = await supabase
      .from('searches')
      .select('id, query, location, status, error_message, created_at')
      .eq('auto_search_run_id', runId)
      .order('created_at', { ascending: false });

    if (searchesError) {
      return res.status(400).json({ error: searchesError.message });
    }

    res.json({
      run,
      searches: searches || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auto-search/runs/:runId/export
 * Downloads the XLSX export for a specific run.
 */
router.get('/runs/:runId/export', async (req, res, next) => {
  try {
    const { runId } = req.params;
    const xlsx = await exportRunResultsToXlsx(runId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="auto-search-${runId.slice(0, 8)}.xlsx"`);
    res.send(xlsx);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
