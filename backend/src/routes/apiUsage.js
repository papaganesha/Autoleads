const express = require('express');
const router = express.Router();
const { getUsageStats, getRemainingQuota } = require('../services/apiUsageTracker');

/**
 * GET /api/usage/:apiName
 * Get usage stats for a specific API
 */
router.get('/:apiName', async (req, res, next) => {
  try {
    const { apiName } = req.params;
    const stats = await getUsageStats(apiName);

    if (!stats) {
      return res.status(404).json({ error: 'API not found' });
    }

    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/usage
 * Get all API usage stats
 */
router.get('/', async (req, res, next) => {
  try {
    const supabase = require('../db/supabase');
    const { data: allUsage, error } = await supabase
      .from('api_usage')
      .select('*')
      .order('api_name');

    if (error) {
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }

    const stats = (allUsage || []).map((usage) => ({
      apiName: usage.api_name,
      used: usage.requests_used,
      limit: usage.total_requests_limit,
      remaining: usage.requests_available,
      lastUpdated: usage.updated_at,
      percentageUsed: Math.round((usage.requests_used / usage.total_requests_limit) * 100),
    }));

    return res.json({ apis: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/usage/:apiName/remaining
 * Get remaining quota for an API
 */
router.get('/:apiName/remaining', async (req, res, next) => {
  try {
    const { apiName } = req.params;
    const remaining = await getRemainingQuota(apiName);

    if (remaining === null) {
      return res.status(404).json({ error: 'API not found' });
    }

    return res.json({ apiName, remaining });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
