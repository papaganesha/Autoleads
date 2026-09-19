const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Use a placeholder URL when env vars are not set so the module loads
// without throwing. Calls will fail at runtime with a clear Supabase error.
const supabaseUrl = config.supabaseUrl || 'https://placeholder.supabase.co';
const supabaseKey = config.supabaseServiceKey || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
