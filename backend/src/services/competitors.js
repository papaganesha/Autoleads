const googleMaps = require('./googleMaps');
const supabase = require('../db/supabase');

/**
 * Find nearby competitors for a lead.
 * Calls Google Maps Nearby Search, filters out the lead itself,
 * calculates distances, saves results, and returns the array.
 */
async function findNearby(lead, category) {
  if (!lead.latitude || !lead.longitude) {
    return [];
  }

  try {
    const places = await googleMaps.nearbySearch(
      lead.latitude,
      lead.longitude,
      category,
      1000
    );

    // Filter out the lead itself by place_id or by name+address match
    const competitors = places
      .filter((place) => {
        if (lead.place_id && place.id === lead.place_id) return false;
        // Also filter by name similarity as a fallback
        const placeName = (place.displayName?.text || '').toLowerCase();
        const leadName = (lead.name || '').toLowerCase();
        if (placeName === leadName) return false;
        return true;
      })
      .map((place) => {
        const lat = place.location?.latitude || 0;
        const lng = place.location?.longitude || 0;
        const distance = googleMaps.calculateDistance(
          lead.latitude,
          lead.longitude,
          lat,
          lng
        );

        return {
          lead_id: lead.id,
          place_id: place.id,
          name: place.displayName?.text || 'Unknown',
          address: place.formattedAddress || null,
          latitude: lat,
          longitude: lng,
          distance_meters: Math.round(distance),
          rating: place.rating || null,
          user_rating_count: place.userRatingCount || 0,
          phone: place.internationalPhoneNumber || null,
          website: place.websiteUri || null,
          google_maps_url: place.googleMapsUri || null,
        };
      });

    // Save competitors to database
    if (competitors.length > 0) {
      // Delete existing competitors for this lead first, then insert fresh
      await supabase
        .from('competitors')
        .delete()
        .eq('lead_id', lead.id);

      await supabase
        .from('competitors')
        .insert(competitors);
    }

    return competitors;
  } catch (err) {
    console.error(`[Competitors] Error finding nearby for lead ${lead.id}:`, err.message);
    return [];
  }
}

module.exports = {
  findNearby,
};
