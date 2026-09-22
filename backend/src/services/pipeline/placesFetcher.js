const googleMaps = require('../googleMaps');

async function fetchPlaces(query, location) {
  return googleMaps.textSearch(query, location);
}

module.exports = { fetchPlaces };
