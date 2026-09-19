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
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

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
});

module.exports = app;
