const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const searchRouter = require('./search');
const { logAudit } = require('../utils/auditLog');

const CITIES = [
  // Portugal (12)
  'Lisboa, Portugal',
  'Porto, Portugal',
  'Braga, Portugal',
  'Coimbra, Portugal',
  'Faro, Portugal',
  'Funchal, Portugal',
  'Setúbal, Portugal',
  'Aveiro, Portugal',
  'Viseu, Portugal',
  'Évora, Portugal',
  'Leiria, Portugal',
  'Guimarães, Portugal',
  // Espanha (12)
  'Madrid, España',
  'Barcelona, España',
  'Valencia, España',
  'Sevilla, España',
  'Zaragoza, España',
  'Málaga, España',
  'Bilbao, España',
  'Murcia, España',
  'Palma de Mallorca, España',
  'Las Palmas, España',
  'Alicante, España',
  'Granada, España',
];

const NICHES = [
  'Restaurantes',
  'Dentistas',
  'Academia de ginástica',
  'Salão de beleza',
  'Clínica veterinária',
  'Oficina mecânica',
  'Imobiliária',
  'Hotel',
  'Padaria',
  'Clínica de estética',
  'Advogado',
  'Contabilidade',
  'Pet shop',
  'Farmácia',
  'Ótica',
  'Floricultura',
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * POST /api/auto-search/run
 * Shuffle cities and niches, pick 4 of each, run 16 searches.
 * Accepts optional body: { cities: 4, niches: 4 } to override counts.
 */
router.post('/run', async (req, res, next) => {
  try {
    const cityCount = Math.min(24, Math.max(1, parseInt(req.body?.cities, 10) || 4));
    const nicheCount = Math.min(16, Math.max(1, parseInt(req.body?.niches, 10) || 4));

    const selectedCities = shuffle(CITIES).slice(0, cityCount);
    const selectedNiches = shuffle(NICHES).slice(0, nicheCount);

    const totalSearches = selectedCities.length * selectedNiches.length;
    console.log(`[AutoSearch] Starting ${totalSearches} searches: ${cityCount} cities × ${nicheCount} niches`);
    console.log(`[AutoSearch] Cities: ${selectedCities.join(', ')}`);
    console.log(`[AutoSearch] Niches: ${selectedNiches.join(', ')}`);

    const searches = [];

    for (const city of selectedCities) {
      for (const niche of selectedNiches) {
        const { data: search, error } = await supabase
          .from('searches')
          .insert({
            query: niche,
            location: city,
            category: niche,
            status: 'processing',
            total_results: 0,
            processed_results: 0,
          })
          .select()
          .single();

        if (error) {
          console.error(`[AutoSearch] Failed to create search for "${niche}" in "${city}": ${error.message}`);
          continue;
        }

        searches.push({
          id: search.id,
          city,
          niche,
          status: 'queued',
        });
      }
    }

    // Run all pipelines in background (sequentially to avoid rate limits)
    (async () => {
      for (const s of searches) {
        try {
          console.log(`[AutoSearch] Running pipeline: "${s.niche}" in "${s.city}" (search ${s.id})`);
          await searchRouter.runPipeline(s.id, s.niche, s.city, s.niche, 10);
          console.log(`[AutoSearch] Completed: "${s.niche}" in "${s.city}"`);
        } catch (err) {
          console.error(`[AutoSearch] Pipeline failed for "${s.niche}" in "${s.city}":`, err.message);
          await supabase
            .from('searches')
            .update({ status: 'error' })
            .eq('id', s.id);
        }
      }
      console.log(`[AutoSearch] All ${searches.length} searches completed`);
    })();

    return res.status(201).json({
      message: `${searches.length} searches started`,
      totalSearches: searches.length,
      cities: selectedCities,
      niches: selectedNiches,
      searches,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auto-search/config
 * Returns the available cities and niches lists.
 */
router.get('/config', (req, res) => {
  res.json({ cities: CITIES, niches: NICHES });
});

module.exports = router;
