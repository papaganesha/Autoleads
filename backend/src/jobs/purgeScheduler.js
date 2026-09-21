const cron = require('node-cron');
const supabase = require('../db/supabase');
const logger = require('../utils/logger');
const { logAudit, hashSha256 } = require('../utils/auditLog');
const { DELETION_RETENTION_DAYS } = require('../config/lgpd');

/**
 * Scheduled job: purge leads where deletion_requests status='approved' and scheduled_purge_at <= NOW()
 * Runs daily at 03:00 UTC by default.
 */
function startPurgeScheduler() {
  // Cron schedule: 03:00 UTC daily (adjust with env var if needed)
  const schedule = process.env.LGPD_PURGE_CRON || '0 3 * * *';

  const task = cron.schedule(schedule, async () => {
    logger.info('[PurgeScheduler] Starting deletion purge job');

    try {
      // Fetch all approved deletion requests that have passed their scheduled_purge_at
      const { data: deleteRequests, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('id, lead_id')
        .eq('status', 'approved')
        .lte('scheduled_purge_at', new Date().toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch deletion requests: ${fetchError.message}`);
      }

      if (!deleteRequests || deleteRequests.length === 0) {
        logger.info('[PurgeScheduler] No deletion requests to purge');
        return;
      }

      logger.info(`[PurgeScheduler] Found ${deleteRequests.length} deletion request(s) to purge`);

      let purgedCount = 0;

      for (const request of deleteRequests) {
        try {
          const { lead_id, id: requestId } = request;

          // Fetch the lead to get place_id before deletion
          const { data: lead } = await supabase
            .from('leads')
            .select('id, place_id')
            .eq('id', lead_id)
            .single();

          if (lead) {
            // Hash the place_id for the audit log (non-reversible reference)
            const placeIdHash = hashSha256(lead.place_id);

            // Delete the lead (cascade deletes all related records)
            const { error: deleteError } = await supabase
              .from('leads')
              .delete()
              .eq('id', lead_id);

            if (deleteError) {
              logger.warn(
                `[PurgeScheduler] Failed to delete lead ${lead_id}: ${deleteError.message}`
              );
              continue;
            }

            // Log the deletion event (with hashed place_id, not PII)
            await logAudit(
              'deletion_purged',
              lead_id,
              { place_id_hash: placeIdHash },
              'purge-scheduler'
            );

            // Redact PII and mark as purged
            const { error: updateError } = await supabase
              .from('deletion_requests')
              .update({
                status: 'purged',
                purged_at: new Date().toISOString(),
                requester_name: null,
                requester_contact: null,
                reason: null,
              })
              .eq('id', requestId);

            if (updateError) {
              logger.warn(
                `[PurgeScheduler] Failed to update deletion_request ${requestId}: ${updateError.message}`
              );
              continue;
            }

            purgedCount++;
            logger.info(`[PurgeScheduler] Purged lead ${lead_id} from request ${requestId}`);
          }
        } catch (err) {
          logger.warn(`[PurgeScheduler] Error processing request ${request.id}: ${err.message}`);
        }
      }

      logger.info(`[PurgeScheduler] Purge job complete. Purged: ${purgedCount}`);
    } catch (err) {
      logger.error(`[PurgeScheduler] Fatal error: ${err.message}`);
    }
  });

  return task;
}

module.exports = { startPurgeScheduler };
