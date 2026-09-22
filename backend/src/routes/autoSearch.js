const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { getConfig, updateConfig, toggleEnabled } = require('../services/scheduler/autoSearchConfigService');
const { triggerRun } = require('../services/scheduler/autoSearchRunner');
const { exportRunResultsToXlsx } = require('../services/scheduler/autoSearchExporter');
const { getRunSnapshot } = require('../services/scheduler/autoSearchRunQueries');
const { pickCities } = require('../services/scheduler/cityPicker');
const { pickNiches } = require('../services/scheduler/nichePicker');
const runEvents = require('../utils/runEvents');
const { requestStop } = require('../services/scheduler/runControl');

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
 * GET /api/auto-search/preview
 * Preview what will be run without creating a run (for confirmation modal).
 */
router.get('/preview', async (req, res, next) => {
  try {
    const config = await getConfig();
    const cities = pickCities(config);
    const niches = pickNiches(config);
    const totalSearches = cities.length * niches.length;

    res.json({
      cities,
      niches,
      totalSearches,
      estimatedMinutes: Math.ceil(totalSearches * 1.5),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auto-search/run
 * Manually triggers an auto-search run (returns immediately).
 */
router.post('/run', async (req, res, next) => {
  try {
    const result = await triggerRun('manual');
    if (!result) {
      return res.status(409).json({ error: 'Run could not be triggered' });
    }

    res.status(201).json({
      message: `Auto-search run started with ${result.totalSearches} searches`,
      runId: result.runId,
      totalSearches: result.totalSearches,
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
    const snapshot = await getRunSnapshot(runId);

    if (!snapshot) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auto-search/runs/:runId/events
 * Server-Sent Events endpoint for live run progress updates.
 */
router.get('/runs/:runId/events', async (req, res, next) => {
  try {
    const { runId } = req.params;

    const snapshot = await getRunSnapshot(runId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

    const unsubscribe = runEvents.subscribe(runId, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auto-search/runs/:runId/stop
 * Requests to stop a running auto-search run.
 */
router.post('/runs/:runId/stop', async (req, res, next) => {
  try {
    const { runId } = req.params;

    const { data: run, error } = await supabase
      .from('auto_search_runs')
      .select('id, status')
      .eq('id', runId)
      .single();

    if (error || !run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (run.status !== 'running') {
      return res.status(409).json({ error: `Cannot stop run with status: ${run.status}` });
    }

    requestStop(runId);
    res.status(202).json({
      message: 'Parada solicitada — finalizando a busca atual antes de parar.',
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
    const xlsxBuffer = await exportRunResultsToXlsx(runId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="auto-search-${runId.slice(0, 8)}.xlsx"`);
    res.send(xlsxBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
