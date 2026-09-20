const supabase = require('../db/supabase');
const copyGenerator = require('../services/copyGenerator');
const { generateWhatsAppLink } = require('../utils/helpers');

/**
 * GET /api/leads
 * List all leads with pagination, filtering, and scores.
 */
async function listLeads(req, res, next) {
  try {
    const {
      temperature,
      search_id,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('leads')
      .select('*, lead_scores(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search_id) {
      query = query.eq('search_id', search_id);
    }

    const { data: leads, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    let results = leads || [];

    if (temperature) {
      results = results.filter((lead) => {
        const score = Array.isArray(lead.lead_scores)
          ? lead.lead_scores[0]
          : lead.lead_scores;
        return score?.temperature === temperature;
      });
    }

    return res.json({
      data: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
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

module.exports = {
  listLeads,
  getLeadById,
  updateLeadStatus,
  regenerateCopy,
  selectCopyVariant,
  getWhatsAppLink,
};
