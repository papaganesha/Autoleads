/**
 * Express error-handling middleware.
 * Catches all errors thrown or passed via next(err) in routes.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
