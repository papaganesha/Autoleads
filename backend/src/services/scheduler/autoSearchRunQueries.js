const supabase = require('../../db/supabase');

async function getRunSnapshot(runId) {
  const { data: run, error: runError } = await supabase
    .from('auto_search_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    return null;
  }

  const { data: searches, error: searchesError } = await supabase
    .from('searches')
    .select('id, query, location, status, error_message, created_at')
    .eq('auto_search_run_id', runId)
    .order('created_at', { ascending: false });

  if (searchesError) {
    return null;
  }

  return { run, searches: searches || [] };
}

module.exports = { getRunSnapshot };
