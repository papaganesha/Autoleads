const config = require('../config/env');

/**
 * Send a hot lead notification to Discord via webhook.
 * Posts a rich embed with lead details.
 */
async function sendHotLeadNotification(lead, score) {
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
        value: `${score.totalScore}/110 (${score.temperature.toUpperCase()})`,
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

  if (lead.website) {
    embed.fields.push({
      name: 'Website',
      value: lead.website,
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
