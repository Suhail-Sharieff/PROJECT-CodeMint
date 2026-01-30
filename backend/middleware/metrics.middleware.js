import { apiRequestCounter, apiRequestDuration } from "../Utils/promethus_connection.utils.js";

export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = res.statusCode;
    const route = req.route?.path || req.path;

    // Record metrics
    apiRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: statusCode
    });

    apiRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: statusCode
      },
      duration
    );

    console.log(`📊 Metrics: ${req.method} ${route} [${statusCode}] ${duration.toFixed(3)}s`);

    // Call the original send
    return originalSend.call(this, data);
  };

  next();
};
