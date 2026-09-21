const supabase = require('../db/supabase');
const { logAudit } = require('../utils/auditLog');
const { DELETION_RETENTION_DAYS } = require('../config/lgpd');

/**
 * POST /api/deletion-requests
 * Create a new deletion request (public endpoint, no auth required).
 */
async function createDeletionRequest(req, res, next) {
  try {
    const { requester_name, requester_contact, reason } = req.body;

    if (!requester_name || !requester_contact || !reason) {
      return res
        .status(400)
        .json({
          error: 'requester_name, requester_contact, and reason are required',
        });
    }

    const { data: request, error } = await supabase
      .from('deletion_requests')
      .insert([
        {
          requester_name,
          requester_contact,
          reason,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deletion request: ${error.message}`);
    }

    // Log the deletion request event
    await logAudit(
      'deletion_requested',
      null,
      {
        deletion_request_id: request.id,
        requester_contact_hash: request.requester_contact, // Store as-is for now
      },
      'public-form'
    );

    return res.status(201).json({
      message: 'Solicitação de remoção recebida. Entraremos em contato em breve.',
      request_id: request.id,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/deletion-requests/:id
 * Admin action: approve or reject a deletion request.
 * Protected by X-Admin-Key header check.
 */
async function updateDeletionRequest(req, res, next) {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.LGPD_ADMIN_KEY;

    if (!expectedKey || !adminKey || adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'status must be "approved" or "rejected"' });
    }

    // Fetch current request to log the event
    const { data: current } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Deletion request not found' });
    }

    const updateData = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminKey ? 'admin' : null,
    };

    if (status === 'approved') {
      // Schedule purge for DELETION_RETENTION_DAYS in the future
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + DELETION_RETENTION_DAYS);
      updateData.scheduled_purge_at = scheduledDate.toISOString();
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason || null;
    }

    const { data: updated, error } = await supabase
      .from('deletion_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update deletion request: ${error.message}`);
    }

    // Log the approval or rejection
    await logAudit(
      status === 'approved' ? 'deletion_approved' : 'deletion_rejected',
      updated.lead_id,
      {
        deletion_request_id: id,
        rejection_reason: rejection_reason || null,
      },
      'admin'
    );

    return res.json({
      message: `Deletion request ${status}`,
      request: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createDeletionRequest,
  updateDeletionRequest,
};
