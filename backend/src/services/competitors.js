const googleMaps = require('./googleMaps');
const supabase = require('../db/supabase');

/**
 * Find nearby competitors for a lead.
 * Calls Google Maps Nearby Search, filters out the lead itself,
 * calculates distances, sorts by proximity, saves results, and returns the array.
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

    const leadPlaceId = lead.place_id || lead.google_place_id;
    const leadName = (lead.name || '').trim().toLowerCase();

    // Filter out the lead itself by place_id / google_place_id or by name match
    const competitors = places
      .filter((place) => {
        if (leadPlaceId && place.id === leadPlaceId) return false;
        
        const placeName = (place.displayName?.text || '').trim().toLowerCase();
        if (leadName && placeName === leadName) return false;
        
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

        const distanceMeters = Math.round(distance);
        const name = place.displayName?.text || 'Unknown';
        const reviewCount = place.userRatingCount || 0;
        const rating = place.rating || null;
        const website = place.websiteUri || null;
        const googlePlaceId = place.id;

        return {
          lead_id: lead.id,
          competitor_name: name,
          distance_meters: distanceMeters,
          rating,
          review_count: reviewCount,
          website,
          place_id: googlePlaceId,
          // Frontend / downstream compatibility aliases
          name,
          distance: distanceMeters,
          reviewCount,
          address: place.formattedAddress || null,
          latitude: lat,
          longitude: lng,
          phone: place.internationalPhoneNumber || null,
          google_maps_url: place.googleMapsUri || null,
        };
      })
      .sort((a, b) => a.distance_meters - b.distance_meters);

    // Save competitors to database (strip non-DB alias properties if needed, or Supabase ignores extra properties)
    if (competitors.length > 0) {
      const dbPayload = competitors.map(({ name, distance, reviewCount, address, latitude, longitude, phone, google_maps_url, ...dbRow }) => dbRow);

      await supabase
        .from('competitors')
        .delete()
        .eq('lead_id', lead.id);

      const { error: insertError } = await supabase
        .from('competitors')
        .insert(dbPayload);

      if (insertError) {
        console.error(`[Competitors] Error inserting competitors for lead ${lead.id}:`, insertError.message);
      }
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

