const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { generateLeadsCSV, generateFilename } = require('../utils/csvGenerator');

/**
 * GET /api/export/csv
 * Export leads to CSV file.
 * Supports ?search_id= and ?temperature= filters.
 */
router.get('/csv', async (req, res, next) => {
  try {
    const { search_id, temperature } = req.query;

    // Build query
    let query = supabase
      .from('leads')
      .select('*, lead_scores(*), instagram_data(*)');

    if (search_id) {
      query = query.eq('search_id', search_id);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    let filtered = leads || [];

    // Filter by temperature if provided
    if (temperature) {
      filtered = filtered.filter((lead) => {
        const score = Array.isArray(lead.lead_scores)
          ? lead.lead_scores[0]
          : lead.lead_scores;
        return score?.temperature === temperature;
      });
    }

    // Transform for CSV
    const transformed = filtered.map((lead) => {
      const score = Array.isArray(lead.lead_scores)
        ? lead.lead_scores[0]
        : lead.lead_scores;
      const ig = Array.isArray(lead.instagram_data)
        ? lead.instagram_data[0]
        : lead.instagram_data;

      return {
        ...lead,
        temperature: score?.temperature,
        score: score?.total_score,
        instagram: ig,
      };
    });

    // Generate CSV
    const csvContent = generateLeadsCSV(transformed);
    const filename = generateFilename();

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
