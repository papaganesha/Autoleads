const gmail = require('../services/gmail');
const discord = require('../services/discord');

/**
 * POST /api/notifications/daily-summary
 * Manually trigger the daily email summary.
 */
async function sendDailySummary(req, res, next) {
  try {
    const result = await gmail.sendDailySummary();
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/test-discord
 * Send a test notification to the Discord webhook.
 */
async function testDiscord(req, res, next) {
  try {
    const testLead = {
      name: 'Teste AutoLeads',
      category: 'Teste',
      address: 'Rua Teste, 123 - Cidade, UF',
      phone: '+55 11 99999-9999',
      rating: 4.8,
      user_rating_count: 120,
      website: 'https://example.com',
      google_maps_url: 'https://maps.google.com',
    };

    const testScore = {
      totalScore: 85,
      temperature: 'hot',
    };

    await discord.sendHotLeadNotification(testLead, testScore);

    return res.json({ success: true, message: 'Test notification sent to Discord' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendDailySummary,
  testDiscord,
};
