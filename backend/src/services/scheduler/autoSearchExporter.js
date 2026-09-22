const supabase = require('../../db/supabase');
const axios = require('axios');
const ExcelJS = require('exceljs');
const config = require('../../config/env');

async function exportRunResultsToXlsx(runId) {
  const { data: run, error: runError } = await supabase
    .from('auto_search_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    throw new Error(`Failed to fetch run ${runId}`);
  }

  const { data: searches, error: searchError } = await supabase
    .from('searches')
    .select('id')
    .eq('auto_search_run_id', runId);

  if (searchError) {
    throw new Error(`Failed to fetch searches for run ${runId}`);
  }

  const searchIds = (searches || []).map(s => s.id);
  if (searchIds.length === 0) {
    throw new Error(`No searches found for run ${runId}`);
  }

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*, instagram_data(*), lead_scores(*), copy_variations(*)')
    .in('search_id', searchIds)
    .order('created_at', { ascending: false });

  if (leadsError) {
    throw new Error(`Failed to fetch leads for run ${runId}`);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Categoria', key: 'category', width: 25 },
    { header: 'Endereço', key: 'address', width: 40 },
    { header: 'Telefone', key: 'phone', width: 20 },
    { header: 'Website', key: 'website', width: 40 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Avaliações', key: 'user_rating_count', width: 12 },
    { header: 'Instagram Handle', key: 'instagram_handle', width: 25 },
    { header: 'Seguidores', key: 'instagram_followers', width: 15 },
    { header: 'Score', key: 'total_score', width: 10 },
    { header: 'Temperatura', key: 'temperature', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Criado em', key: 'created_at', width: 20 },
  ];

  leads.forEach((lead) => {
    const igData = Array.isArray(lead.instagram_data) ? lead.instagram_data[0] : lead.instagram_data;
    const scoreData = Array.isArray(lead.lead_scores) ? lead.lead_scores[0] : lead.lead_scores;

    worksheet.addRow({
      id: lead.id,
      name: lead.name,
      category: lead.category,
      address: lead.address,
      phone: lead.phone || '',
      website: lead.website || '',
      rating: lead.rating || '',
      user_rating_count: lead.user_rating_count || 0,
      instagram_handle: igData?.handle || '',
      instagram_followers: igData?.followers_count || 0,
      total_score: scoreData?.total_score || 0,
      temperature: scoreData?.temperature || 'cold',
      status: lead.status,
      created_at: new Date(lead.created_at).toLocaleString('pt-BR'),
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21C4' } };

  return workbook;
}

async function sendXlsxToWebhook(runId, xlsxBuffer) {
  const webhookUrl = process.env.AUTO_SEARCH_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[AutoSearchExporter] AUTO_SEARCH_WEBHOOK_URL not configured, skipping webhook');
    return;
  }

  try {
    await axios.post(webhookUrl, {
      event: 'auto_search_completed',
      run_id: runId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[AutoSearchExporter] Webhook notified for run ${runId}`);
  } catch (err) {
    console.error(`[AutoSearchExporter] Failed to send webhook for run ${runId}:`, err.message);
  }
}

module.exports = { exportRunResultsToXlsx, sendXlsxToWebhook };
