const config = require('../config/env');
const { trackApiUsage } = require('./apiUsageTracker');

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
].join(',');

/**
 * Map Portuguese category names to Google Places types.
 */
function mapCategoryToType(category) {
  const mapping = {
    'salão de beleza': 'beauty_salon',
    'barbearia': 'barber_shop',
    'restaurante': 'restaurant',
    'lanchonete': 'fast_food_restaurant',
    'padaria': 'bakery',
    'academia': 'gym',
    'clínica odontológica': 'dentist',
    'clínica médica': 'doctor',
    'pet shop': 'pet_store',
    'farmácia': 'pharmacy',
    'loja de roupas': 'clothing_store',
    'mecânica': 'car_repair',
    'hotel': 'hotel',
    'café': 'cafe',
    'bar': 'bar',
    'supermercado': 'supermarket',
    'lavanderia': 'laundry',
    'estúdio de tatuagem': 'tattoo_parlor',
    'imobiliária': 'real_estate_agency',
    'escritório de advocacia': 'lawyer',
    'consultório': 'doctor',
    'escola': 'school',
    'floricultura': 'florist',
    'ótica': 'optician',
    'joalheria': 'jewelry_store',
  };

  const key = (category || '').toLowerCase().trim();
  return mapping[key] || null;
}

/**
 * Haversine formula to calculate distance in meters between two lat/lng points.
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Google Places Text Search (New API).
 * Searches for places matching a free-text query, fetching up to 2 pages (~40 places).
 * Always requests maxResultCount: 20 (Google's per-page limit), and if a nextPageToken
 * is present, fetches the second page after a short delay and merges results.
 */
async function textSearch(query, location) {
  const body = {
    textQuery: location ? `${query} em ${location}` : query,
    maxResultCount: 20,
    languageCode: 'pt-BR',
  };

  console.log('[GoogleMaps] textSearch query:', body.textQuery);
  console.log('[GoogleMaps] API key present:', !!config.googleMapsApiKey, '- length:', (config.googleMapsApiKey || '').length);

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': config.googleMapsApiKey,
    'X-Goog-FieldMask': FIELD_MASK,
  };

  // First page
  const res1 = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res1.ok) {
    const errorText = await res1.text();
    console.error('[GoogleMaps] Text Search page 1 error:', res1.status, errorText);
    throw new Error(`Google Maps Text Search failed (${res1.status}): ${errorText}`);
  }

  const data1 = await res1.json();
  const places = data1.places || [];

  // Track API usage
  await trackApiUsage('google_places', 1);

  // Second page if available
  if (data1.nextPageToken) {
    console.log('[GoogleMaps] Fetching second page of results...');
    await sleep(2000); // Google's pagination token needs a moment to activate

    const body2 = {
      textQuery: body.textQuery,
      maxResultCount: 20,
      languageCode: 'pt-BR',
      pageToken: data1.nextPageToken,
    };

    const res2 = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers,
      body: JSON.stringify(body2),
    });

    if (res2.ok) {
      const data2 = await res2.json();
      places.push(...(data2.places || []));
      console.log('[GoogleMaps] Merged second page, total:', places.length);

      // Track second page API usage
      await trackApiUsage('google_places', 1);
    } else {
      console.warn('[GoogleMaps] Second page fetch failed, continuing with first page only');
    }
  }

  console.log(`[GoogleMaps] Text Search returned ${places.length} total places`);
  return places;
}

/**
 * Google Places Nearby Search (New API).
 * Finds competitors near a given latitude/longitude within a radius.
 * Returns empty array if category is unknown.
 */
async function nearbySearch(lat, lng, category, radius = 1000) {
  const includedType = mapCategoryToType(category);

  // If category maps to nothing, we can't search by type — return empty
  if (!includedType) {
    return [];
  }

  const body = {
    includedTypes: [includedType],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radius,
      },
    },
    languageCode: 'pt-BR',
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googleMapsApiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Maps Nearby Search failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  // Track API usage for nearby search
  await trackApiUsage('google_places', 1);

  return data.places || [];
}

/**
 * Google Places Autocomplete (New API).
 * Provides municipality and location predictions as the user types.
 */
async function autocompletePlaces(input) {
  if (!input || !input.trim()) return [];

  const body = {
    input: input.trim(),
    includedPrimaryTypes: ['locality', 'administrative_area_level_2', 'sublocality', 'neighborhood', 'political'],
    includedRegionCodes: ['br'],
    languageCode: 'pt-BR',
  };

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googleMapsApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[GoogleMaps] Autocomplete error:', res.status, errorText);
    return [];
  }

  const data = await res.json();
  const suggestions = data.suggestions || [];

  return suggestions.map((s) => ({
    place_id: s.placePrediction?.placeId || '',
    description: s.placePrediction?.text?.text || '',
    main_text: s.placePrediction?.structuredFormat?.mainText?.text || '',
    secondary_text: s.placePrediction?.structuredFormat?.secondaryText?.text || '',
  }));
}

/**
 * Get detailed place information including reviews.
 * Uses Google Places API getDetails endpoint.
 */
async function getPlaceDetails(placeId) {
  if (!placeId) return null;

  try {
    const detailedFieldMask = [
      'places.id',
      'places.displayName',
      'places.reviews',
    ].join(',');

    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
        'X-Goog-FieldMask': detailedFieldMask,
      },
    });

    if (!res.ok) {
      console.error(`[GoogleMaps] GetPlaceDetails error for ${placeId}:`, res.status);
      return null;
    }

    const data = await res.json();
    trackApiUsage('google_places', 1); // Charge 1 credit for details call

    return {
      placeId: data.id,
      displayName: data.displayName,
      reviews: data.reviews || [],
    };
  } catch (err) {
    console.error(`[GoogleMaps] Error fetching place details for ${placeId}:`, err.message);
    return null;
  }
}

module.exports = {
  textSearch,
  nearbySearch,
  autocompletePlaces,
  mapCategoryToType,
  calculateDistance,
  getPlaceDetails,
};

