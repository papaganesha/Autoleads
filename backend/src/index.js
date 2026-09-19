const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const searchRoutes = require('./routes/search');
const leadsRoutes = require('./routes/leads');
const notificationsRoutes = require('./routes/notifications');

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
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`[AutoLeads] Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[AutoLeads] ENV check: GOOGLE_MAPS_API_KEY=${config.googleMapsApiKey ? 'SET (' + config.googleMapsApiKey.length + ' chars)' : 'MISSING'}`);
  console.log(`[AutoLeads] ENV check: GEMINI_API_KEY=${config.geminiApiKey ? 'SET' : 'MISSING'}`);
  console.log(`[AutoLeads] ENV check: SUPABASE_URL=${config.supabaseUrl ? 'SET' : 'MISSING'}`);
  console.log(`[AutoLeads] ENV check: FRONTEND_URL=${config.frontendUrl}`);
});

module.exports = app;
