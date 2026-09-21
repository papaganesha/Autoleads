// LGPD Configuration — all values are configurable, these are placeholders

// Retention period for approved deletion requests before auto-purge (days)
// Default: 90 days (Brazilian data protection law typical range for business records)
// Adjust based on legal counsel's recommendation for your specific use case
const DELETION_RETENTION_DAYS = parseInt(
  process.env.LGPD_DELETION_RETENTION_DAYS || '90',
  10
);

module.exports = {
  DELETION_RETENTION_DAYS,
};
