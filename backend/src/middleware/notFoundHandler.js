/**
 * 404 Not Found Middleware
 * Invoked when no preceding route matches the incoming request URL.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};
