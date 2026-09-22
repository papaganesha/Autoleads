const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { startPurgeScheduler } = require('./jobs/purgeScheduler');
const { startAutoSearchScheduler } = require('./jobs/autoSearchScheduler');
const { refreshSchema } = require('./utils/schemaRefresh');

const searchRoutes = require('./routes/search');
const leadsRoutes = require('./routes/leads');
const notificationsRoutes = require('./routes/notifications');
const exportRoutes = require('./routes/export');
const deletionRequestsRoutes = require('./routes/deletionRequests');
const apiUsageRoutes = require('./routes/apiUsage');
const autoSearchRoutes = require('./routes/autoSearch');
const metaRoutes = require('./routes/meta');

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      config.frontendUrl,
      'https://autoleads-frontend-production.up.railway.app',
      'http://localhost:5173',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Request logger with Morgan
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/deletion-requests', deletionRequestsRoutes);
app.use('/api/usage', apiUsageRoutes);
app.use('/api/auto-search', autoSearchRoutes);
app.use('/api/meta', metaRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server and jobs
app.listen(config.port, async () => {
  logger.info(`[AutoLeads] Server running on port ${config.port} (${config.nodeEnv})`);
  logger.info(`[AutoLeads] ENV check: GOOGLE_MAPS_API_KEY=${config.googleMapsApiKey ? 'SET (' + config.googleMapsApiKey.length + ' chars)' : 'MISSING'}`);
  logger.info(`[AutoLeads] ENV check: GEMINI_API_KEY=${config.geminiApiKey ? 'SET' : 'MISSING'}`);
  logger.info(`[AutoLeads] ENV check: SUPABASE_URL=${config.supabaseUrl ? 'SET' : 'MISSING'}`);
  logger.info(`[AutoLeads] ENV check: FRONTEND_URL=${config.frontendUrl}`);

  // Force schema introspection
  await refreshSchema();

  // Clean up any orphaned runs left in 'running' status from previous crashes
  const supabase = require('./db/supabase');
  try {
    const { error } = await supabase
      .from('auto_search_runs')
      .update({ status: 'interrupted' })
      .eq('status', 'running');
    if (!error) {
      logger.info('[AutoLeads] Cleaned up orphaned running auto-search runs');
    }
  } catch (err) {
    logger.warn('[AutoLeads] Failed to cleanup orphaned runs:', err.message);
  }

  // Start LGPD deletion purge scheduler
  startPurgeScheduler();
  logger.info('[AutoLeads] LGPD deletion purge scheduler started');

  // Start auto-search scheduler
  startAutoSearchScheduler();
  logger.info('[AutoLeads] Auto-search scheduler started');
});

module.exports = app;

