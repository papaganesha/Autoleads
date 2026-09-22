const brazilianCities = require('../../data/brazilianCities.json');

function getTopPopulousCities(state, count) {
  if (!state) {
    const allCities = [];
    Object.values(brazilianCities).forEach(stateData => {
      allCities.push(...stateData.cities);
    });
    return allCities.slice(0, count);
  }

  const stateData = brazilianCities[state];
  if (!stateData) {
    throw new Error(`Invalid state: ${state}`);
  }

  return stateData.cities.slice(0, count);
}

function pickCities(config) {
  if (config.city_selection_mode === 'manual') {
    if (config.manual_cities.length === 0) {
      throw new Error('Manual cities mode selected but no manual cities configured');
    }
    return config.manual_cities.slice(0, config.city_count);
  }

  return getTopPopulousCities(config.state, config.city_count);
}

module.exports = { pickCities, getTopPopulousCities };
