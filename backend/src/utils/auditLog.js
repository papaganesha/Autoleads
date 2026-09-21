const crypto = require('crypto');
const supabase = require('../db/supabase');
const logger = require('./logger');

/**
 * Hash a string using SHA256 (non-reversible, stable reference).
 */
function hashSha256(str) {
  if (!str) return null;
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Log an audit event to the audit_log table.
 * Wrapped in try/catch: failures are logged but never thrown.
 */
async function logAudit(event, leadId, metadata, actor = 'system') {
  try {
    // For deletion events, hash the place_id if available
    let leadPlaceIdHash = null;
    if (leadId && metadata?.place_id) {
      leadPlaceIdHash = hashSha256(metadata.place_id);
    }

    const record = {
      event,
      lead_id: leadId || null,
      lead_place_id_hash: leadPlaceIdHash,
      actor,
      metadata: metadata || {},
      event_at: new Date().toISOString(),
    };

    await supabase.from('audit_log').insert([record]);
  } catch (err) {
    logger.warn(`[AuditLog] Failed to log event '${event}' for lead ${leadId}: ${err.message}`);
    // Intentionally do not throw — audit failures must never break the product
  }
}

module.exports = {
  logAudit,
  hashSha256,
};
