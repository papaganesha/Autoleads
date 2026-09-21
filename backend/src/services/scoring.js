const supabase = require('../db/supabase');

/**
 * Pure scoring function.
 * Returns { totalScore, temperature, scoreBreakdown, hasCompetitors }
 *
 * LOW-TECH SCORING (Max 100): Rewards businesses WITHOUT technology/digital presence
 * - No website = high opportunity for digital transformation
 * - Low Instagram followers = untapped social media potential
 * - Few Google reviews = optimization opportunity
 *
 * Scoring breakdown (total = 100):
 * - Website: 25 pts (critical: no site = biggest opportunity)
 * - Instagram followers: 20 pts (pouca presença = +20)
 * - Instagram posts: 15 pts (inativo = oportunidade)
 * - Google reviews: 20 pts (pouco histórico = oportunidade)
 * - Rating: 10 pts (ruim = melhorar)
 * - Phone/WhatsApp: 10 pts (sem contato = não otimizado)
 */
function calculateScore(lead, instagramData, competitors) {
  const breakdown = {};
  let total = 0;

  // Website: NO SITE = +25 (biggest opportunity indicator)
  if (!lead.website) {
    breakdown.website = 25;
    total += 25;
  } else {
    breakdown.website = 0;
  }

  // Instagram followers: <500 followers = +20 (low digital presence)
  const followers = instagramData ? instagramData.followers_count || 0 : 0;
  if (followers < 500) {
    breakdown.instagram_followers = 20;
    total += 20;
  } else {
    breakdown.instagram_followers = 0;
  }

  // Instagram activity: No posts OR inactive = +15
  const postsCount = instagramData ? instagramData.posts_count || 0 : 0;
  if (postsCount === 0) {
    breakdown.instagram_activity = 15;
    total += 15;
  } else {
    breakdown.instagram_activity = 0;
  }

  // Google reviews: <50 reviews = +20 (not yet optimized on GMB)
  const reviewCount = lead.user_rating_count || 0;
  if (reviewCount < 50) {
    breakdown.google_reviews = 20;
    total += 20;
  } else {
    breakdown.google_reviews = 0;
  }

  // Rating: <4.0 stars = +10 (room for improvement / service quality concern)
  const rating = lead.rating || 0;
  if (rating < 4.0) {
    breakdown.rating = 10;
    total += 10;
  } else {
    breakdown.rating = 0;
  }

  // Phone/WhatsApp: No discoverable direct-contact channel anywhere = +10
  // Check both Maps phone and Instagram bio-detected contact
  const hasMapsPhone = !!lead.phone;
  const hasBioContact = !!(instagramData && instagramData.has_bio_contact);
  if (!hasMapsPhone && !hasBioContact) {
    breakdown.phone = 10;
    total += 10;
  } else {
    breakdown.phone = 0;
  }

  // Determine temperature (LOW-TECH scoring: higher = better opportunities)
  let temperature;
  if (total >= 70) {
    temperature = 'hot';    // Ideal: very low-tech, huge opportunity
  } else if (total >= 40) {
    temperature = 'warm';   // Moderate opportunity
  } else {
    temperature = 'cold';   // Already digitalized or optimized
  }

  // Store competitor count for reference (not part of score)
  const competitorCount = competitors ? competitors.length : 0;
  const hasCompetitors = competitorCount >= 3;

  return {
    totalScore: total,
    temperature,
    scoreBreakdown: breakdown,
    hasCompetitors,
  };
}

/**
 * Score a lead and persist the result to the lead_scores table.
 */
async function scoreAndSave(leadId, lead, instagramData, competitors) {
  const result = calculateScore(lead, instagramData, competitors);

  const record = {
    lead_id: leadId,
    total_score: result.totalScore,
    temperature: result.temperature,
    score_breakdown: result.scoreBreakdown,
    has_competitors: result.hasCompetitors,
    scored_at: new Date().toISOString(),
  };

  await supabase
    .from('lead_scores')
    .upsert(record, { onConflict: 'lead_id' });

  return result;
}

module.exports = {
  calculateScore,
  scoreAndSave,
};
