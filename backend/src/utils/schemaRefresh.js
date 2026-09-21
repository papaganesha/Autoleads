const supabase = require('../db/supabase');

async function refreshSchema() {
  try {
    // Force introspection by listing tables
    console.log('[SchemaRefresh] Forcing schema introspection...');
    const { data, error } = await supabase
      .from('deletion_requests')
      .select('id')
      .limit(1);
    
    if (data !== undefined) {
      console.log('[SchemaRefresh] ✅ deletion_requests table accessible');
    }
    if (error) {
      console.log('[SchemaRefresh] Error:', error.message);
    }
  } catch (err) {
    console.log('[SchemaRefresh] Error:', err.message);
  }
}

module.exports = { refreshSchema };
