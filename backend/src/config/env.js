require('dotenv').config();

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  summaryEmailTo: process.env.SUMMARY_EMAIL_TO,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

module.exports = config;
