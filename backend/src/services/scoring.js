const supabase = require('../db/supabase');

/**
 * Pure scoring function.
 * Returns { totalScore, temperature, scoreBreakdown, hasCompetitors }
 */
function calculateScore(lead, instagramData, competitors) {
  const breakdown = {};
  let total = 0;

  // Website exists -> +20
  if (lead.website) {
    breakdown.website = 20;
    total += 20;
  } else {
    breakdown.website = 0;
  }

  // Instagram 500+ followers -> +20
  const followers = instagramData ? instagramData.followers_count || 0 : 0;
  if (followers >= 500) {
    breakdown.instagram_followers = 20;
    total += 20;
  } else {
    breakdown.instagram_followers = 0;
  }

  // Posted in last 7 days -> +15
  // We check posts_count as a proxy (if they have posts, they are active)
  const postsCount = instagramData ? instagramData.posts_count || 0 : 0;
  if (postsCount > 0) {
    breakdown.recent_activity = 15;
    total += 15;
  } else {
    breakdown.recent_activity = 0;
  }

  // 50+ Google reviews -> +20
  const reviewCount = lead.user_rating_count || 0;
  if (reviewCount >= 50) {
    breakdown.reviews = 20;
    total += 20;
  } else {
    breakdown.reviews = 0;
  }

  // Rating 4.0+ -> +15
  const rating = lead.rating || 0;
  if (rating >= 4.0) {
    breakdown.rating = 15;
    total += 15;
  } else {
    breakdown.rating = 0;
  }

  // Phone exists (WhatsApp potential) -> +10
  if (lead.phone) {
    breakdown.phone = 10;
    total += 10;
  } else {
    breakdown.phone = 0;
  }

  // 3+ competitors nearby -> +10
  const competitorCount = competitors ? competitors.length : 0;
  const hasCompetitors = competitorCount >= 3;
  if (hasCompetitors) {
    breakdown.competitors = 10;
    total += 10;
  } else {
    breakdown.competitors = 0;
  }

  // Determine temperature
  let temperature;
  if (total >= 70) {
    temperature = 'hot';
  } else if (total >= 40) {
    temperature = 'warm';
  } else {
    temperature = 'cold';
  }

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
