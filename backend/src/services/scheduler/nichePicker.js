const categories = require('../../data/categories.json');

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickNiches(config) {
  if (config.niche_selection_mode === 'manual') {
    if (config.manual_niches.length === 0) {
      throw new Error('Manual niches mode selected but no manual niches configured');
    }
    return config.manual_niches.slice(0, config.niche_count);
  }

  const shuffled = shuffle(categories);
  return shuffled.slice(0, config.niche_count);
}

module.exports = { pickNiches };
