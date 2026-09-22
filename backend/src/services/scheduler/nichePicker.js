const categories = require('../../data/categories.json');

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isNewDay(lastResetDate) {
  if (!lastResetDate) return true;
  const today = new Date().toISOString().split('T')[0];
  const lastReset = new Date(lastResetDate).toISOString().split('T')[0];
  return today !== lastReset;
}

function pickNiches(config, nicheUsedToday = []) {
  if (config.niche_selection_mode === 'manual') {
    if (config.manual_niches.length === 0) {
      throw new Error('Manual niches mode selected but no manual niches configured');
    }
    return config.manual_niches.slice(0, config.niche_count);
  }

  // Filter out niches already used today
  const availableNiches = categories.filter(niche => !nicheUsedToday.includes(niche));

  // If all niches exhausted today, reset and use all
  const nichesToUse = availableNiches.length > 0 ? availableNiches : categories;

  const shuffled = shuffle(nichesToUse);
  return shuffled.slice(0, config.niche_count);
}

module.exports = { pickNiches, isNewDay };
