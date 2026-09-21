const express = require('express');
const router = express.Router();
const {
  createDeletionRequest,
  updateDeletionRequest,
} = require('../controllers/deletionRequestsController');

/**
 * POST /api/deletion-requests
 * Public endpoint: create a new deletion request (no auth required).
 */
router.post('/', createDeletionRequest);

/**
 * PATCH /api/deletion-requests/:id
 * Admin action: approve or reject a deletion request.
 * Protected by X-Admin-Key header.
 */
router.patch('/:id', updateDeletionRequest);

module.exports = router;
