const config = require('../config/env');

/**
 * Generate a personalized WhatsApp link with a lead-specific message.
 */
function generateWhatsAppLink(phone, businessName) {
  if (!phone) return null;
  const message = encodeURIComponent(`Olá ${businessName}! 👋 Vi seu negócio e gostaria de conversar sobre oportunidades de crescimento. Podemos agendar uma chamada?`);
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`;
}

/**
 * Generate an Instagram link.
 */
function generateInstagramLink(handle) {
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

/**
 * Send a hot lead notification to Discord via webhook.
 * Posts a rich embed with lead details, Instagram data, and clickable contact links.
 */
async function sendHotLeadNotification(lead, score, instagramData) {
  if (!config.discordWebhookUrl) {
    console.warn('[Discord] No webhook URL configured, skipping notification.');
    return;
  }

  const embed = {
    title: `🔥 Lead Quente: ${lead.name}`,
    color: 0xff4500, // Orange-red
    fields: [
      {
        name: 'Score',
        value: `${score.totalScore}/100 (${score.temperature.toUpperCase()})`,
        inline: true,
      },
      {
        name: 'Nota Google',
        value: lead.rating ? `${lead.rating} (${lead.user_rating_count || 0} avaliações)` : 'N/A',
        inline: true,
      },
      {
        name: 'Categoria',
        value: lead.category || 'N/A',
        inline: true,
      },
      {
        name: 'Telefone',
        value: lead.phone || 'N/A',
        inline: true,
      },
      {
        name: 'Endereço',
        value: lead.address || 'N/A',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'AutoLeads MVP',
    },
  };

  // Instagram with clickable link
  if (instagramData?.handle) {
    const igLink = generateInstagramLink(instagramData.handle);
    embed.fields.push({
      name: '📸 Instagram',
      value: `[${instagramData.handle}](${igLink}) (${instagramData.followers_count || 0} seguidores)`,
      inline: false,
    });
  } else {
    embed.fields.push({
      name: '📸 Instagram',
      value: 'Não encontrado',
      inline: false,
    });
  }

  // Social presence indicators with clickable links
  const socialPresence = [];
  if (lead.website) socialPresence.push(`🌐 [Site](${lead.website})`);
  if (lead.phone) {
    const waLink = generateWhatsAppLink(lead.phone, lead.name);
    socialPresence.push(`📱 [WhatsApp](${waLink})`);
  }
  if (lead.facebook_url) socialPresence.push(`📘 [Facebook](${lead.facebook_url})`);

  if (socialPresence.length > 0) {
    embed.fields.push({
      name: 'Presença Online',
      value: socialPresence.join(' • '),
      inline: false,
    });
  }

  if (lead.google_maps_url) {
    embed.url = lead.google_maps_url;
  }

  const payload = {
    username: 'AutoLeads Bot',
    embeds: [embed],
  };

  try {
    const res = await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Discord] Webhook failed (${res.status}): ${errorText}`);
    }
  } catch (err) {
    console.error('[Discord] Error sending notification:', err.message);
  }
}

module.exports = {
  sendHotLeadNotification,
};
