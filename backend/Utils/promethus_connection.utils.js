import { collectDefaultMetrics, register} from "prom-client";

// default metrics v can show like CPU,heap, eventloop time etc
collectDefaultMetrics({ timeout: 5000 });


// export metrics endpoint handler
export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error('Error gathering metrics:', err);
    res.status(500).end(err.message);
  }
};