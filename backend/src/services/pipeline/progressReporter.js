const supabase = require('../../db/supabase');
const searchEvents = require('../../utils/searchEvents');

async function updateProgress(searchId, patch) {
  const { data, error } = await supabase
    .from('searches')
    .update(patch)
    .eq('id', searchId)
    .select()
    .single();

  if (!error && data) {
    searchEvents.emitUpdate(searchId, data);
  }

  return { data, error };
}

module.exports = { updateProgress };
