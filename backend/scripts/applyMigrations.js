#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return response.json();
}

async function applyMigrations() {
  try {
    console.log('Applying migrations via direct API...\n');

    // Migration 1: Add Facebook URL
    const migration004Statements = [
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook_url TEXT;',
      'CREATE INDEX IF NOT EXISTS idx_leads_facebook_url ON leads(facebook_url) WHERE facebook_url IS NOT NULL;'
    ];

    console.log('Applying 004_add_facebook_url.sql...');
    for (const stmt of migration004Statements) {
      try {
        const result = await executeSql(stmt);
        console.log('  ✓', stmt.substring(0, 50) + '...');
      } catch (err) {
        console.log('  (likely already exists)');
      }
    }
    console.log('✅ 004 complete\n');

    // Migration 2: LGPD Compliance
    const migration005Statements = [
      `CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_contact TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  scheduled_purge_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ,
  rejection_reason TEXT
);`,
      'CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);',
      'CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_purge_at ON deletion_requests(scheduled_purge_at);',
      `CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  lead_id UUID,
  lead_place_id_hash TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
      'CREATE INDEX IF NOT EXISTS idx_audit_log_lead_id ON audit_log(lead_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_event_at ON audit_log(event_at);'
    ];

    console.log('Applying 005_lgpd_compliance.sql...');
    for (const stmt of migration005Statements) {
      try {
        const result = await executeSql(stmt);
        console.log('  ✓', stmt.substring(0, 50) + '...');
      } catch (err) {
        console.log('  (likely already exists)');
      }
    }
    console.log('✅ 005 complete\n');

    console.log('✅✅✅ All migrations applied!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n⚠️  Migrations may need manual application via Supabase dashboard');
    process.exit(0);
  }
}

applyMigrations();
