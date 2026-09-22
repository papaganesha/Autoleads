const supabase = require('../../db/supabase');
const { logAudit } = require('../../utils/auditLog');
const { isValidWebsite } = require('../../utils/helpers');

async function upsertLead(place, searchId, category, query) {
  const rawWebsiteUri = place.websiteUri || null;
  const validWebsite = rawWebsiteUri && isValidWebsite(rawWebsiteUri) ? rawWebsiteUri : null;
  const resolvedCategory = category && String(category).trim() ? category : query;

  const leadData = {
    search_id: searchId,
    place_id: place.id,
    name: place.displayName?.text || 'Unknown',
    address: place.formattedAddress || null,
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    phone: place.internationalPhoneNumber || null,
    website: validWebsite,
    google_maps_url: place.googleMapsUri || null,
    rating: place.rating || null,
    user_rating_count: place.userRatingCount || 0,
    category: resolvedCategory,
    status: 'new',
  };

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .upsert(leadData, { onConflict: 'place_id' })
    .select()
    .single();

  if (leadError || !lead) {
    throw new Error(`Failed to upsert lead: ${leadError?.message}`);
  }

  return { lead, rawWebsiteUri };
}

async function logLeadEvent(lead, isNew, placeId) {
  if (isNew) {
    await logAudit('lead_created', lead.id, { place_id: placeId }, 'system');
  } else {
    await logAudit('lead_linked_existing', lead.id, { place_id: placeId }, 'system');
  }
}

async function updateSearchIdIfNeeded(leadId, searchId) {
  const { data: lead } = await supabase
    .from('leads')
    .select('search_id')
    .eq('id', leadId)
    .single();

  if (lead && lead.search_id !== searchId) {
    await supabase
      .from('leads')
      .update({ search_id: searchId })
      .eq('id', leadId);
  }
}

module.exports = { upsertLead, logLeadEvent, updateSearchIdIfNeeded };
