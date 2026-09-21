const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { generateLeadsCSV, generateFilename } = require('../utils/csvGenerator');

/**
 * GET /api/export/csv
 * Export leads to CSV file.
 * Supports ?search_id=, ?temperature=, ?website=, and ?whatsapp= filters.
 */
router.get('/csv', async (req, res, next) => {
  try {
    const { search_id, temperature, website, whatsapp } = req.query;

    // Build query using leads_enriched view for consistent filtering
    let query = supabase
      .from('leads_enriched')
      .select('*');

    if (search_id) {
      query = query.eq('search_id', search_id);
    }

    if (temperature) {
      query = query.eq('temperature', temperature);
    }

    // Apply website and whatsapp filters at DB level
    if (website === 'with') {
      query = query.not('website', 'is', null);
    } else if (website === 'without') {
      query = query.is('website', null);
    }

    if (whatsapp === 'with') {
      query = query.not('phone', 'is', null);
    } else if (whatsapp === 'without') {
      query = query.is('phone', null);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    // Transform for CSV
    const transformed = (rows || []).map((row) => ({
      id: row.id,
      search_id: row.search_id,
      name: row.name,
      category: row.category,
      address: row.address,
      phone: row.phone,
      website: row.website,
      rating: row.rating,
      user_rating_count: row.user_rating_count,
      facebook_url: row.facebook_url,
      status: row.status,
      temperature: row.temperature,
      score: row.total_score,
      instagram_handle: row.instagram_handle,
      instagram_followers: row.instagram_followers_count,
    }));

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
