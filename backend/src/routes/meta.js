const express = require('express');
const router = express.Router();
const categories = require('../data/categories.json');
const brazilianCities = require('../data/brazilianCities.json');

router.get('/categories', (req, res) => {
  res.json({ categories });
});

router.get('/states', (req, res) => {
  const states = Object.keys(brazilianCities).map(key => {
    const state = brazilianCities[key];
    return {
      code: key,
      name: state.name,
      city_count: state.cities.length,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  res.json({ states, default: null });
});

router.get('/cities', (req, res) => {
  const { state, limit = '10' } = req.query;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  if (!state) {
    const allCities = [];
    Object.values(brazilianCities).forEach(stateData => {
      allCities.push(...stateData.cities);
    });
    return res.json({ cities: allCities.slice(0, limitNum) });
  }

  if (!brazilianCities[state]) {
    return res.status(400).json({ error: `Invalid state: ${state}` });
  }

  const cities = brazilianCities[state].cities.slice(0, limitNum);
  res.json({ state, cities });
});

module.exports = router;
