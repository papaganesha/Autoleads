const brazilianCities = require('../../data/brazilianCities.json');

const NATIONAL_TOP_CITIES = [
  'São Paulo',
  'Rio de Janeiro',
  'Brasília',
  'Salvador',
  'Fortaleza',
  'Belo Horizonte',
  'Manaus',
  'Curitiba',
  'Recife',
  'Porto Alegre',
  'Goiânia',
  'Guarulhos',
  'Campinas',
  'São Bernardo do Campo',
  'Santo André',
  'Osasco',
  'Sorocaba',
  'Ribeirão Preto',
  'Santos',
  'Piracicaba',
  'Maceió',
  'João Pessoa',
  'Teresina',
  'Natal',
  'Aracaju',
  'Belém',
  'Anápolis',
  'Maringá',
  'Londrina',
  'Blumenau',
];

function getTopPopulousCities(state, count) {
  if (!state) {
    return NATIONAL_TOP_CITIES.slice(0, count);
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
