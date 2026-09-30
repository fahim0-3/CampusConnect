/**
 * Centralized Request Logging Middleware for API Gateway
 *
 * Logs method, incoming path, matched target service, response status code,
 * and request duration in milliseconds.
 */
function createGatewayLogger(registry) {
  return function gatewayLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl } = req;

    // Identify target service based on path prefix
    let targetServiceName = "API Gateway";
    for (const key of Object.keys(registry)) {
      if (originalUrl.startsWith(registry[key].prefix)) {
        targetServiceName = registry[key].name;
        break;
      }
    }

    res.on("finish", () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const logLine = `[GATEWAY] ${new Date().toISOString()} | ${method} ${originalUrl} -> ${targetServiceName} | Status: ${status} (${duration}ms)`;

      if (status >= 500) {
        console.error(logLine);
      } else if (status >= 400) {
        console.warn(logLine);
      } else {
        console.log(logLine);
      }
    });

    next();
  };
}

module.exports = { createGatewayLogger };
