const logger = require('../utils/logger');

/**
 * Express error-handling middleware.
 * Catches all errors thrown or passed via next(err) in routes.
 */
function errorHandler(err, req, res, _next) {
  logger.error({ err, method: req.method, url: req.originalUrl }, `[Error] ${req.method} ${req.originalUrl}: ${err.message}`);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;

