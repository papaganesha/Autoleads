const nodemailer = require('nodemailer');
const config = require('../config/env');
const supabase = require('../db/supabase');

/**
 * Create a nodemailer transporter for Gmail SMTP.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Send the daily lead summary email.
 * Fetches today's leads from Supabase, groups by temperature, sends HTML email.
 */
async function sendDailySummary() {
  if (!config.smtp.user || !config.smtp.pass) {
    console.warn('[Gmail] SMTP credentials not configured, skipping daily summary.');
    return { success: false, reason: 'SMTP not configured' };
  }

  if (!config.summaryEmailTo) {
    console.warn('[Gmail] No recipient configured for daily summary.');
    return { success: false, reason: 'No recipient configured' };
  }

  // Get today's date range (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  // Fetch today's leads with their scores
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, lead_scores(*)')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Gmail] Error fetching leads:', error.message);
    return { success: false, reason: error.message };
  }

  if (!leads || leads.length === 0) {
    console.log('[Gmail] No leads found for today, skipping summary.');
    return { success: true, reason: 'No leads today' };
  }

  // Group by temperature
  const grouped = { hot: [], warm: [], cold: [] };
  for (const lead of leads) {
    const score = lead.lead_scores?.[0] || lead.lead_scores;
    const temp = score?.temperature || 'cold';
    grouped[temp].push({ ...lead, score });
  }

  // Build HTML email
  const html = buildSummaryHtml(grouped, leads.length);

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"AutoLeads" <${config.smtp.user}>`,
    to: config.summaryEmailTo,
    subject: `AutoLeads - Resumo Diário (${leads.length} leads) - ${todayStart.toLocaleDateString('pt-BR')}`,
    html: html,
  });

  console.log(`[Gmail] Daily summary sent: ${info.messageId}`);
  return { success: true, messageId: info.messageId, leadsCount: leads.length };
}

/**
 * Build the HTML content for the daily summary email.
 */
function buildSummaryHtml(grouped, totalCount) {
  const renderLeadRow = (lead) => {
    const score = lead.score;
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.category || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.rating || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${score?.total_score || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.phone || '-'}</td>
      </tr>
    `;
  };

  const renderSection = (title, leads, color) => {
    if (leads.length === 0) return '';
    return `
      <h2 style="color: ${color}; margin-top: 24px;">${title} (${leads.length})</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Nome</th>
            <th style="padding: 8px; text-align: left;">Categoria</th>
            <th style="padding: 8px; text-align: left;">Nota</th>
            <th style="padding: 8px; text-align: left;">Score</th>
            <th style="padding: 8px; text-align: left;">Telefone</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(renderLeadRow).join('')}
        </tbody>
      </table>
    `;
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">AutoLeads - Resumo Diário</h1>
      <p style="color: #666; font-size: 16px;">Total de leads hoje: <strong>${totalCount}</strong></p>

      <div style="display: flex; gap: 16px; margin: 16px 0;">
        <div style="background: #fee; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #e53e3e;">
          <strong style="color: #e53e3e;">🔥 Quentes: ${grouped.hot.length}</strong>
        </div>
        <div style="background: #fef3cd; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #dd6b20;">
          <strong style="color: #dd6b20;">🟡 Mornos: ${grouped.warm.length}</strong>
        </div>
        <div style="background: #e8f4fd; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #3182ce;">
          <strong style="color: #3182ce;">🔵 Frios: ${grouped.cold.length}</strong>
        </div>
      </div>

      ${renderSection('🔥 Leads Quentes', grouped.hot, '#e53e3e')}
      ${renderSection('🟡 Leads Mornos', grouped.warm, '#dd6b20')}
      ${renderSection('🔵 Leads Frios', grouped.cold, '#3182ce')}

      <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">Gerado automaticamente por AutoLeads MVP</p>
    </div>
  `;
}

module.exports = {
  sendDailySummary,
};
