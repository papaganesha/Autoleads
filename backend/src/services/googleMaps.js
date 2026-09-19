const config = require('../config/env');

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
  return mapping[key] || 'establishment';
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
 * Searches for places matching a free-text query near a location string.
 */
async function textSearch(query, location) {
  const body = {
    textQuery: location ? `${query} em ${location}` : query,
    maxResultCount: 20,
    languageCode: 'pt-BR',
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
    throw new Error(`Google Maps Text Search failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.places || [];
}

/**
 * Google Places Nearby Search (New API).
 * Finds competitors near a given latitude/longitude within a radius.
 */
async function nearbySearch(lat, lng, category, radius = 1000) {
  const includedType = mapCategoryToType(category);

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
  return data.places || [];
}

module.exports = {
  textSearch,
  nearbySearch,
  mapCategoryToType,
  calculateDistance,
};
