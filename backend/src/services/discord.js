const config = require('../config/env');

/**
 * Generate a personalized WhatsApp link with a lead-specific message.
 */
function generateWhatsAppLink(phone, businessName) {
  if (!phone) return null;
  const message = encodeURIComponent(`Ola ${businessName}! Vi seu negocio e gostaria de conversar sobre oportunidades de crescimento. Podemos agendar uma chamada?`);
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
    title: `Lead Quente: ${lead.name}`,
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
      name: 'Instagram',
      value: `[${instagramData.handle}](${igLink}) (${instagramData.followers_count || 0} seguidores)`,
      inline: false,
    });
  } else {
    embed.fields.push({
      name: 'Instagram',
      value: 'Nao encontrado',
      inline: false,
    });
  }

  // Social presence indicators with clickable links
  const socialPresence = [];
  if (lead.website) socialPresence.push(`[Site](${lead.website})`);
  if (lead.phone) {
    const waLink = generateWhatsAppLink(lead.phone, lead.name);
    socialPresence.push(`[WhatsApp](${waLink})`);
  }
  if (lead.facebook_url) socialPresence.push(`[Facebook](${lead.facebook_url})`);

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

/**
 * Send a run summary to Discord after execution completes.
 * Shows stats: total leads, hot/warm/cold counts, best leads found, etc.
 */
async function sendRunSummary(runId, stats) {
  if (!config.discordWebhookUrl) {
    console.warn('[Discord] No webhook URL configured, skipping summary.');
    return;
  }

  const { totalLeads, newLeads, knownLeads, hotLeads, warmLeads, coldLeads, topLeads, searchesCompleted, searchesFailed, runStartedAt, runFinishedAt, todayRunNumber, maxRunsPerDay, cities, niches } = stats;

  const statusEmoji = hotLeads.length > 0 ? '🔥' : '✅';
  const color = hotLeads.length > 0 ? 0xff4500 : 0x00aa00; // Orange-red for hot, green for success
  const startTime = runStartedAt ? new Date(runStartedAt).toLocaleString('pt-BR') : 'N/A';

  // Calculate duration in minutes
  let durationMinutes = '?';
  if (runStartedAt && runFinishedAt) {
    const start = new Date(runStartedAt);
    const finished = new Date(runFinishedAt);
    durationMinutes = Math.round((finished - start) / 60000);
  }

  const embed = {
    title: `${statusEmoji} Execução ${todayRunNumber}/${maxRunsPerDay}`,
    description: `${startTime}`,
    color,
    fields: [
      {
        name: '📋 Execução',
        value: `**Run**: \`${runId.slice(0, 8)}\`\n**Cidades**: ${cities?.length || 0} • **Nichos**: ${niches?.length || 0}`,
        inline: false,
      },
      {
        name: '📊 Resultados',
        value: `**Leads**: ${totalLeads} (${newLeads} novos + ${knownLeads} conhecidos) • **Duração**: ${durationMinutes}min\n**Buscas**: ${searchesCompleted} ✅ | ${searchesFailed} ❌`,
        inline: false,
      },
      {
        name: '🌡️ Distribuição',
        value: `🔥 **Hot** (≥65): ${hotLeads.length}\n🟡 **Warm** (40-64): ${warmLeads.length}\n❄️ **Cold** (<40): ${coldLeads.length}`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'AutoLeads MVP',
    },
  };

  // Show top leads (hot or warm)
  if (topLeads && topLeads.length > 0) {
    const topList = topLeads.slice(0, 3).map(l =>
      `${l.temperature === 'hot' ? '🔥' : '🟡'} **${l.name}** (${l.totalScore}/100)`
    ).join('\n');
    embed.fields.push({
      name: '⭐ Melhores Oportunidades',
      value: topList,
      inline: false,
    });
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
      console.error(`[Discord] Summary webhook failed (${res.status}): ${errorText}`);
    } else {
      console.log(`[Discord] Run summary sent for ${runId}`);
    }
  } catch (err) {
    console.error('[Discord] Error sending run summary:', err.message);
  }
}

module.exports = {
  sendHotLeadNotification,
  sendRunSummary,
};
