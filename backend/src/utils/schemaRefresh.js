const supabase = require('../db/supabase');

async function refreshSchema(retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[SchemaRefresh] Forcing schema introspection (attempt ${attempt}/${retries})...`);
      const { data, error } = await Promise.race([
        supabase
          .from('deletion_requests')
          .select('id')
          .limit(1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 5000)
        ),
      ]);

      if (data !== undefined) {
        console.log('[SchemaRefresh] ✅ deletion_requests table accessible');
        return;
      }
      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      console.warn(`[SchemaRefresh] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`[SchemaRefresh] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        console.warn('[SchemaRefresh] ⚠️ Failed to refresh schema after retries. App will continue, but queries may fail.');
      }
    }
  }
}

module.exports = { refreshSchema };
