import { apiRequestCounter, apiRequestDuration } from "../Utils/custom_prometheus_metrics.util.js";

export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const durationMs = Date.now() - startTime;
    const durationSec = durationMs / 1000;
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
      durationSec
    );

    console.log(`📊 Metrics: ${req.method} ${route} [${statusCode}] ${durationMs}ms`);

    // recorded metrics, now v can call nxt meth
    return originalSend.call(this, data);
  };

  next();
};
