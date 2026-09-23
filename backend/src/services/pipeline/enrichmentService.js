const supabase = require('../../db/supabase');
const instagram = require('../instagram');
const facebook = require('../facebook');
const scoring = require('../scoring');
const copyGenerator = require('../copyGenerator');
const discord = require('../discord');
const { logAudit } = require('../../utils/auditLog');

async function enrichLead(lead, rawWebsiteUri) {
  let enrichmentFailed = false;
  let instagramData = null;
  let score = null;
  const errors = [];

  try {
    instagramData = await instagram.scrapeInstagram(lead.id, rawWebsiteUri, lead.name, lead.place_id, lead.google_maps_url);
    if (instagramData?.handle) {
      await logAudit('enriched_instagram', lead.id, {
        handle: instagramData.handle,
        followers: instagramData.followers_count,
      }, 'system');
    }

    if (instagramData?.bio_phone && !lead.phone) {
      await supabase
        .from('leads')
        .update({ phone: instagramData.bio_phone })
        .eq('id', lead.id);
      lead.phone = instagramData.bio_phone;
      await logAudit('phone_filled_from_instagram_bio', lead.id, {
        source: 'instagram_bio',
        phone: instagramData.bio_phone,
      }, 'system');
    }
  } catch (igErr) {
    console.error(`[Enrichment] Instagram scrape failed for lead ${lead.id}:`, igErr.message);
    await supabase
      .from('instagram_data')
      .upsert({
        lead_id: lead.id,
        handle: null,
        scrape_status: 'failed',
        error_message: igErr.message,
      }, { onConflict: 'lead_id' });
    enrichmentFailed = true;
    errors.push(`Instagram: ${igErr.message}`);
  }

  try {
    const facebookUrl = await facebook.findFacebook(lead.id, rawWebsiteUri);
    if (facebookUrl) {
      await logAudit('enriched_facebook', lead.id, { facebook_url: facebookUrl }, 'system');
    }
  } catch (fbErr) {
    console.error(`[Enrichment] Facebook discovery failed for lead ${lead.id}:`, fbErr.message);
  }

  try {
    score = await scoring.scoreAndSave(lead.id, lead, instagramData, []);
    await logAudit('scored', lead.id, {
      total_score: score.totalScore,
      temperature: score.temperature,
    }, 'system');
  } catch (scoreErr) {
    console.error(`[Enrichment] Scoring failed for lead ${lead.id}:`, scoreErr.message);
    await supabase
      .from('lead_scores')
      .upsert({
        lead_id: lead.id,
        temperature: 'cold',
        total_score: 0,
        score_breakdown: { error: scoreErr.message },
      }, { onConflict: 'lead_id' });
    enrichmentFailed = true;
    errors.push(`Scoring: ${scoreErr.message}`);
  }

  // TODO: Re-enable copy generation when Gemini quota is available or on a paid plan
  // if (score) {
  //   try {
  //     await copyGenerator.generateCopyVariations(lead, instagramData, [], score);
  //   } catch (copyErr) {
  //     console.error(`[Enrichment] Copy generation failed for lead ${lead.id}:`, copyErr.message);
  //     await supabase
  //       .from('copy_variations')
  //       .upsert({
  //         lead_id: lead.id,
  //         pain_point: null,
  //         social_proof: null,
  //         urgency: null,
  //         value: null,
  //         generated_at: new Date().toISOString(),
  //       }, { onConflict: 'lead_id' });
  //     enrichmentFailed = true;
  //     errors.push(`CopyGen: ${copyErr.message}`);
  //   }
  // }

  if (score && score.temperature === 'hot' && !enrichmentFailed) {
    try {
      await discord.sendHotLeadNotification(lead, score, instagramData);
    } catch (discordErr) {
      console.warn(`[Enrichment] Discord notification failed for lead ${lead.id}:`, discordErr.message);
    }
  }

  if (enrichmentFailed) {
    await supabase
      .from('leads')
      .update({ status: 'enrichment_failed', error_message: errors.join('; ') })
      .eq('id', lead.id);
    console.log(`[Enrichment] Lead ${lead.id} enrichment failed: ${errors.join('; ')}`);
  }

  return { enrichmentFailed, score, instagramData, errors };
}

module.exports = { enrichLead };
