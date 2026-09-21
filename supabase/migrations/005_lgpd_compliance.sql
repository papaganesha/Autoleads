-- LGPD Compliance: Deletion requests and audit log

CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_contact TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | purged
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  scheduled_purge_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_scheduled_purge_at ON deletion_requests(scheduled_purge_at);

-- Unified audit log for LGPD accountability (Art. 37)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  lead_id UUID,
  lead_place_id_hash TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_lead_id ON audit_log(lead_id);
CREATE INDEX idx_audit_log_event ON audit_log(event);
CREATE INDEX idx_audit_log_event_at ON audit_log(event_at);
