const supabase = require('../../db/supabase');

const VALID_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function validateConfig(config) {
  const errors = [];

  if (typeof config.is_enabled !== 'boolean') {
    errors.push('is_enabled must be a boolean');
  }

  if (config.state !== null && config.state !== undefined) {
    if (!VALID_UFS.includes(config.state)) {
      errors.push(`state must be one of: ${VALID_UFS.join(', ')} or null`);
    }
  }

  if (config.city_count < 1 || config.city_count > 50) {
    errors.push('city_count must be between 1 and 50');
  }

  if (!['top_populous', 'manual'].includes(config.city_selection_mode)) {
    errors.push('city_selection_mode must be "top_populous" or "manual"');
  }

  if (!Array.isArray(config.manual_cities)) {
    errors.push('manual_cities must be an array');
  }

  if (config.niche_count < 1 || config.niche_count > 16) {
    errors.push('niche_count must be between 1 and 16');
  }

  if (!['random', 'manual'].includes(config.niche_selection_mode)) {
    errors.push('niche_selection_mode must be "random" or "manual"');
  }

  if (!Array.isArray(config.manual_niches)) {
    errors.push('manual_niches must be an array');
  }

  if (!Array.isArray(config.schedule_times)) {
    errors.push('schedule_times must be an array');
  } else {
    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])$/;
    config.schedule_times.forEach((t, i) => {
      if (!timeRegex.test(t)) {
        errors.push(`schedule_times[${i}]: "${t}" must be in format HH:MM (e.g., "08:00" or "14:30")`);
      }
    });
  }

  if (config.max_runs_per_day < 1 || config.max_runs_per_day > 24) {
    errors.push('max_runs_per_day must be between 1 and 24');
  }

  if (config.results_per_search < 5 || config.results_per_search > 15) {
    errors.push('results_per_search must be between 5 and 15');
  }

  return errors;
}

async function getConfig() {
  const { data, error } = await supabase
    .from('auto_search_config')
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to fetch config: ${error.message}`);
  }

  return data;
}

async function updateConfig(config) {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${errors.join('; ')}`);
  }

  // Get current config ID first
  const currentConfig = await getConfig();

  const { error } = await supabase
    .from('auto_search_config')
    .update({
      is_enabled: config.is_enabled,
      state: config.state || null,
      city_count: config.city_count,
      city_selection_mode: config.city_selection_mode,
      manual_cities: config.manual_cities,
      niche_count: config.niche_count,
      niche_selection_mode: config.niche_selection_mode,
      manual_niches: config.manual_niches,
      schedule_times: config.schedule_times,
      max_runs_per_day: config.max_runs_per_day,
      results_per_search: config.results_per_search,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentConfig.id);

  if (error) {
    throw new Error(`Failed to update config: ${error.message}`);
  }

  return await getConfig();
}

async function addNichesUsedToday(niches) {
  const currentConfig = await getConfig();
  const today = new Date().toISOString().split('T')[0];
  const lastReset = currentConfig.niches_reset_at
    ? new Date(currentConfig.niches_reset_at).toISOString().split('T')[0]
    : null;

  // If it's a new day, reset the tracking
  const nichesUsed = today !== lastReset
    ? niches
    : [...(currentConfig.niches_used_today || []), ...niches];

  const { error } = await supabase
    .from('auto_search_config')
    .update({
      niches_used_today: nichesUsed,
      niches_reset_at: today === lastReset ? currentConfig.niches_reset_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentConfig.id);

  if (error) {
    throw new Error(`Failed to update niches tracking: ${error.message}`);
  }
}

async function toggleEnabled(enabled) {
  const currentConfig = await getConfig();

  const { error } = await supabase
    .from('auto_search_config')
    .update({ is_enabled: enabled })
    .eq('id', currentConfig.id);

  if (error) {
    throw new Error(`Failed to toggle enabled: ${error.message}`);
  }

  return await getConfig();
}

module.exports = { getConfig, updateConfig, toggleEnabled, validateConfig, VALID_UFS, addNichesUsedToday };
