const supabase = require('../db/supabase');
const searchEvents = require('../utils/searchEvents');

// Current search context for event emission
let currentSearchId = null;

function setCurrentSearchId(searchId) {
  currentSearchId = searchId;
}

/**
 * Track API usage and ensure we don't exceed limits
 */
async function trackApiUsage(apiName, amount = 1) {
  try {
    // Get current usage
    const { data: usage, error: fetchError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('api_name', apiName)
      .single();

    if (fetchError) {
      console.error(`[ApiUsage] Failed to fetch usage for ${apiName}:`, fetchError.message);
      return { success: false, error: fetchError.message };
    }

    if (!usage) {
      console.error(`[ApiUsage] No usage record found for ${apiName}`);
      return { success: false, error: 'No usage record found' };
    }

    const newTotal = usage.requests_used + amount;
    const remaining = usage.total_requests_limit - newTotal;

    // Warn if approaching limit
    if (remaining < 50) {
      console.warn(`[ApiUsage] WARNING: ${apiName} has only ${remaining} requests remaining!`);
    }

    // Check if limit exceeded
    if (remaining < 0) {
      console.error(`[ApiUsage] ERROR: ${apiName} quota exceeded! Remaining: ${remaining}`);
      return {
        success: false,
        error: 'API quota exceeded',
        remaining: remaining,
        used: newTotal,
      };
    }

    // Increment usage
    const { error: updateError } = await supabase
      .rpc('increment_api_usage', {
        p_api_name: apiName,
        p_amount: amount,
      });

    if (updateError) {
      console.error(`[ApiUsage] Failed to increment usage for ${apiName}:`, updateError.message);
      return { success: false, error: updateError.message };
    }

    console.log(`[ApiUsage] ${apiName}: +${amount} requests | Used: ${newTotal}/${usage.total_requests_limit} | Remaining: ${remaining}`);

    // Emit event if in search context
    if (currentSearchId) {
      searchEvents.emitUpdate(currentSearchId, {
        type: 'api_usage',
        api_name: apiName,
        amount,
        total: newTotal,
        remaining,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      used: newTotal,
      limit: usage.total_requests_limit,
      remaining: remaining,
    };
  } catch (err) {
    console.error(`[ApiUsage] Exception tracking ${apiName}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get remaining API quota
 */
async function getRemainingQuota(apiName) {
  try {
    const { data: usage, error } = await supabase
      .from('api_usage')
      .select('requests_used, total_requests_limit')
      .eq('api_name', apiName)
      .single();

    if (error || !usage) {
      return null;
    }

    return usage.total_requests_limit - usage.requests_used;
  } catch (err) {
    console.error(`[ApiUsage] Failed to get remaining quota for ${apiName}:`, err.message);
    return null;
  }
}

/**
 * Get full usage stats
 */
async function getUsageStats(apiName) {
  try {
    const { data: usage, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('api_name', apiName)
      .single();

    if (error || !usage) {
      return null;
    }

    return {
      apiName: usage.api_name,
      used: usage.requests_used,
      limit: usage.total_requests_limit,
      remaining: usage.requests_available,
      lastUpdated: usage.updated_at,
      percentageUsed: Math.round((usage.requests_used / usage.total_requests_limit) * 100),
    };
  } catch (err) {
    console.error(`[ApiUsage] Failed to get stats for ${apiName}:`, err.message);
    return null;
  }
}

module.exports = {
  trackApiUsage,
  getRemainingQuota,
  getUsageStats,
  setCurrentSearchId,
};
