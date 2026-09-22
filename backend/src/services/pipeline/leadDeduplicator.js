const supabase = require('../../db/supabase');
const { isValidWebsite } = require('../../utils/helpers');

function matchesFilters(place, websiteFilter, whatsappFilter) {
  const hasValidWebsite = !!place.websiteUri && isValidWebsite(place.websiteUri);
  const hasPhone = !!place.internationalPhoneNumber;

  if (websiteFilter === 'with' && !hasValidWebsite) return false;
  if (websiteFilter === 'without' && hasValidWebsite) return false;
  if (whatsappFilter === 'with' && !hasPhone) return false;
  if (whatsappFilter === 'without' && hasPhone) return false;

  return true;
}

function prioritizePlacesForEnrichment(places) {
  return places.sort((a, b) => {
    const aHasWebsite = !!a.websiteUri && isValidWebsite(a.websiteUri);
    const bHasWebsite = !!b.websiteUri && isValidWebsite(b.websiteUri);
    if (aHasWebsite !== bHasWebsite) return aHasWebsite ? 1 : -1;
    return (b.rating || 0) - (a.rating || 0);
  });
}

async function deduplicateAndFilter(places, websiteFilter, whatsappFilter, resultLimit) {
  const placeIds = places.map(p => p.id);
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('place_id')
    .in('place_id', placeIds);
  const knownPlaceIds = new Set((existingLeads || []).map(l => l.place_id));

  const newPlaces = places.filter(p => !knownPlaceIds.has(p.id));
  const knownPlaces = places.filter(p => knownPlaceIds.has(p.id));

  const filteredNewPlaces = newPlaces.filter(p => matchesFilters(p, websiteFilter, whatsappFilter));
  const filteredKnownPlaces = knownPlaces.filter(p => matchesFilters(p, websiteFilter, whatsappFilter));

  const prioritizedNew = prioritizePlacesForEnrichment(filteredNewPlaces);
  const prioritizedKnown = prioritizePlacesForEnrichment(filteredKnownPlaces);

  const toEnrich = prioritizedNew.slice(0, resultLimit);
  const toLink = prioritizedKnown.slice(0, Math.max(0, resultLimit - toEnrich.length));
  const finalPlaces = toEnrich.concat(toLink);

  return {
    finalPlaces,
    toEnrich,
    toLink,
    stats: {
      total: places.length,
      newCount: newPlaces.length,
      knownCount: knownPlaces.length,
      filteredNewCount: filteredNewPlaces.length,
      filteredKnownCount: filteredKnownPlaces.length,
      toEnrichCount: toEnrich.length,
      toLinkCount: toLink.length,
    }
  };
}

module.exports = { deduplicateAndFilter, matchesFilters, prioritizePlacesForEnrichment };
