const supabase = require('../db/supabase');
const copyGenerator = require('../services/copyGenerator');
const { generateWhatsAppLink } = require('../utils/helpers');
const { logAudit } = require('../utils/auditLog');
const { enrichLead } = require('../services/pipeline/enrichmentService');

/**
 * GET /api/leads
 * List all leads with pagination, filtering, and scores.
 * Uses leads_enriched view for proper ORDER BY score and consistent pagination.
 */
async function listLeads(req, res, next) {
  try {
    const {
      temperature, search_id, website, whatsapp,
      category, rating, instagram, facebook, status,
      page = '1', limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('leads_enriched')
      .select('*', { count: 'exact' })
      .order('total_score', { ascending: false, nullsFirst: false })
      .range(offset, offset + limitNum - 1);

    if (search_id) query = query.eq('search_id', search_id);
    if (temperature) query = query.eq('temperature', temperature);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    if (website === 'with') query = query.not('website', 'is', null);
    else if (website === 'without') query = query.is('website', null);

    if (whatsapp === 'with') query = query.not('phone', 'is', null);
    else if (whatsapp === 'without') query = query.is('phone', null);

    if (instagram === 'with') query = query.not('instagram_handle', 'is', null);
    else if (instagram === 'without') query = query.is('instagram_handle', null);

    if (facebook === 'with') query = query.not('facebook_url', 'is', null);
    else if (facebook === 'without') query = query.is('facebook_url', null);

    if (rating === 'none') {
      query = query.is('rating', null);
    } else if (rating) {
      const minRating = parseFloat(rating);
      if (!Number.isNaN(minRating)) query = query.gte('rating', minRating);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to fetch leads: ${error.message}${error.code ? ` (${error.code})` : ''}`);
    }

    const results = (rows || []).map((row) => ({
      id: row.id, search_id: row.search_id, name: row.name, category: row.category,
      address: row.address, latitude: row.latitude, longitude: row.longitude,
      phone: row.phone, website: row.website, google_maps_url: row.google_maps_url,
      place_id: row.place_id, rating: row.rating, user_rating_count: row.user_rating_count,
      facebook_url: row.facebook_url, status: row.status,
      created_at: row.created_at, updated_at: row.updated_at,
      lead_scores: (row.total_score != null || row.temperature != null) ? {
        total_score: row.total_score, temperature: row.temperature,
        score_breakdown: row.score_breakdown, scored_at: row.scored_at,
      } : null,
      instagram_data: row.instagram_handle ? {
        handle: row.instagram_handle,
        followers_count: row.instagram_followers_count,
        scrape_status: row.instagram_scrape_status,
      } : null,
    }));

    return res.json({
      data: results,
      pagination: {
        page: pageNum, limit: limitNum, total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:id
 * Full lead detail with related data.
 */
async function getLeadById(req, res, next) {
  try {
    const { id } = req.params;

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, instagram_data(*), lead_scores(*), copy_variations(*), competitors(*)')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { data: statusHistory } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', id)
      .order('changed_at', { ascending: false });

    // Transform response to match frontend expectations
    const formatted = formatLeadResponse(lead, statusHistory || []);
    return res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Transform database response to frontend-friendly format.
 * Handles camelCase conversion and nested array unwrapping.
 */
function formatLeadResponse(lead, statusHistory) {
  const igData = Array.isArray(lead.instagram_data)
    ? lead.instagram_data[0]
    : lead.instagram_data;

  const scoreData = Array.isArray(lead.lead_scores)
    ? lead.lead_scores[0]
    : lead.lead_scores;

  const copyData = Array.isArray(lead.copy_variations)
    ? lead.copy_variations[0]
    : lead.copy_variations;

  return {
    id: lead.id,
    search_id: lead.search_id,
    name: lead.name,
    category: lead.category,
    address: lead.address,
    latitude: lead.latitude,
    longitude: lead.longitude,
    phone: lead.phone,
    website: lead.website,
    google_maps_url: lead.google_maps_url,
    place_id: lead.place_id,
    rating: lead.rating,
    user_rating_count: lead.user_rating_count,
    status: lead.status,
    created_at: lead.created_at,
    updated_at: lead.updated_at,

    // Nested data with camelCase aliases for frontend
    instagram_data: igData,
    instagram: igData ? {
      handle: igData.handle,
      followers: igData.followers_count,
      following: igData.following_count,
      posts: igData.posts_count,
      bio: igData.bio,
      profile_pic_url: igData.profile_pic_url,
      scrape_status: igData.scrape_status,
    } : null,

    lead_scores: scoreData,
    temperature: scoreData?.temperature,
    score: scoreData?.total_score,
    score_breakdown: scoreData?.score_breakdown,

    copy_variations: copyData,
    copyVariations: copyData ? {
      pain_point: copyData.pain_point,
      social_proof: copyData.social_proof,
      urgency: copyData.urgency,
      value: copyData.value,
      selected_variant: copyData.selected_variant,
    } : {},

    competitors: lead.competitors || [],
    status_history: statusHistory,
  };
}

/**
 * PATCH /api/leads/:id/status
 * Update a lead's status and record in history.
 */
async function updateLeadStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['new', 'contacted', 'interested', 'not_interested', 'converted', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Get current status for history
    const { data: currentLead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', id)
      .single();

    if (!currentLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update lead status
    const { data: updated, error: updateError } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update status: ${updateError.message}`);
    }

    // Insert status history
    await supabase.from('lead_status_history').insert({
      lead_id: id,
      previous_status: currentLead.status,
      new_status: status,
      notes: notes || null,
    });

    // Log status change for audit trail
    await logAudit('status_changed', id, {
      previous_status: currentLead.status,
      new_status: status,
      notes: notes || null,
    }, 'system');

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/leads/:id/copy
 * Regenerate copy variations for a lead.
 */
async function regenerateCopy(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch lead with related data
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, instagram_data(*), lead_scores(*), competitors(*)')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const instagramData = Array.isArray(lead.instagram_data)
      ? lead.instagram_data[0]
      : lead.instagram_data;
    const competitorsList = lead.competitors || [];
    const score = Array.isArray(lead.lead_scores)
      ? lead.lead_scores[0]
      : lead.lead_scores;

    const copies = await copyGenerator.generateCopyVariations(
      lead,
      instagramData,
      competitorsList,
      score
    );

    return res.json({ copies });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/leads/:id/select-copy
 * Select a copy variant for the lead.
 * Body: { copyNumber: 1-4 }
 * 1=pain_point, 2=social_proof, 3=urgency, 4=value
 */
async function selectCopyVariant(req, res, next) {
  try {
    const { id } = req.params;
    const { copyNumber } = req.body;

    if (!copyNumber || copyNumber < 1 || copyNumber > 4) {
      return res.status(400).json({ error: 'copyNumber must be between 1 and 4' });
    }

    const copyMap = {
      1: 'pain_point',
      2: 'social_proof',
      3: 'urgency',
      4: 'value',
    };

    const selectedField = copyMap[copyNumber];

    // Update copy_variations to mark selected copy
    const { data: updated, error } = await supabase
      .from('copy_variations')
      .update({ selected_variant: selectedField })
      .eq('lead_id', id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({ error: 'Copy variations not found for this lead' });
    }

    return res.json({
      selected: selectedField,
      text: updated[selectedField],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:id/whatsapp
 * Generate a WhatsApp link with the selected copy text.
 */
async function getWhatsAppLink(req, res, next) {
  try {
    const { id } = req.params;

    // Get lead phone
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('phone, name')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!lead.phone) {
      return res.status(400).json({ error: 'Lead has no phone number' });
    }

    // Get selected copy
    const { data: copies, error: copyError } = await supabase
      .from('copy_variations')
      .select('*')
      .eq('lead_id', id)
      .single();

    if (copyError || !copies) {
      return res.status(404).json({ error: 'No copy variations found for this lead' });
    }

    const selectedVariant = copies.selected_variant || 'pain_point';
    const message = copies[selectedVariant] || '';

    const link = generateWhatsAppLink(lead.phone, message);

    return res.json({
      whatsapp_link: link,
      selected_variant: selectedVariant,
      message,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/leads/:id/retry-enrichment
 * Retry enrichment for a failed lead using the shared enrichmentService.
 */
async function retryEnrichment(req, res, next) {
  try {
    const { id } = req.params;

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const rawWebsiteUri = lead.website || null;
    const { enrichmentFailed, score } = await enrichLead(lead, rawWebsiteUri);

    if (score && !enrichmentFailed) {
      await supabase
        .from('leads')
        .update({ status: 'new', error_message: null })
        .eq('id', lead.id);
    }

    const { data: updated } = await supabase
      .from('leads')
      .select('*, instagram_data(*), lead_scores(*), copy_variations(*)')
      .eq('id', id)
      .single();

    return res.json({
      message: 'Enrichment retry completed',
      lead: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/categories
 * Return distinct non-null categories for filtering.
 */
async function listCategories(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = [...new Set(data.map((r) => r.category))].filter(Boolean).sort();
    return res.json({ categories });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLeads,
  listCategories,
  getLeadById,
  updateLeadStatus,
  regenerateCopy,
  selectCopyVariant,
  getWhatsAppLink,
  retryEnrichment,
};
