const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');

// Routes
router.get('/categories', leadsController.listCategories);
router.get('/', leadsController.listLeads);
router.get('/:id', leadsController.getLeadById);
router.patch('/:id/status', leadsController.updateLeadStatus);
router.patch('/:id/retry-enrichment', leadsController.retryEnrichment);
router.post('/:id/copy', leadsController.regenerateCopy);
router.post('/:id/select-copy', leadsController.selectCopyVariant);
router.get('/:id/whatsapp', leadsController.getWhatsAppLink);

module.exports = router;
