import { collectDefaultMetrics, register, Counter, Histogram, Gauge } from "prom-client";

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ timeout: 5000 });

// --- CUSTOM METRICS ---

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
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Socket.IO Connections
export const socketConnections = new Gauge({
  name: 'socket_io_connections',
  help: 'Current number of Socket.IO connections'
});

// Active Users
export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Total number of active users'
});

// Database Queries
export const dbQueryCounter = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'table']
});

// Database Query Duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

// Kafka Events
export const kafkaEventsCounter = new Counter({
  name: 'kafka_events_total',
  help: 'Total Kafka events produced/consumed',
  labelNames: ['topic', 'action'] // action: 'produce' or 'consume'
});

// Test Submissions
export const testSubmissionCounter = new Counter({
  name: 'test_submissions_total',
  help: 'Total test submissions',
  labelNames: ['test_id', 'status'] // status: 'passed', 'failed'
});

// Battle Participants
export const battleParticipants = new Gauge({
  name: 'battle_participants_total',
  help: 'Total participants in active battles',
  labelNames: ['battle_id']
});

// Export metrics endpoint handler
export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error('Error gathering metrics:', err);
    res.status(500).end(err.message);
  }
};