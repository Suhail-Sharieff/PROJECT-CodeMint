import {Counter, Histogram, Gauge } from "prom-client"
// API Request Counter
export const apiRequestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status_code']
});

// API Request Duration
export const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
//   buckets: [0.1, 0.5, 1, 2, 5]//in sec
});

// Active WebSocket Connections
export const activeSocketConnections = new Gauge({
  name: 'socket_connections_active',
  help: 'Number of active WebSocket connections'
});


