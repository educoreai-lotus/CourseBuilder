import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import coursesRoutes from './routes/courses.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import inputRoutes from './routes/input.routes.js';
import lessonsRoutes from './routes/lessons.routes.js';
import integrationRoutes from './routes/integration.routes.js';
// Old integration routes removed - using unified endpoint only
import enrichmentRoutes from './routes/enrichmentRoutes.js';
import enrichmentAssetsRoutes from './routes/enrichmentAssetsRoutes.js';
import { authenticateRequest } from './middleware/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow frontend URL from environment
// Normalize origin by removing trailing slash
const normalizeOrigin = (origin) => {
  if (!origin || origin === '*') return origin;
  return origin.replace(/\/+$/, ''); // Remove trailing slashes
};

const rawAllowedOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map((value) => normalizeOrigin(value.trim()))
  .filter(Boolean);

const isDevelopment = (process.env.NODE_ENV || 'development') !== 'production';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedRequestOrigin = normalizeOrigin(origin);
    
    const isWildcard = allowedOrigins.includes('*');
    const isExplicitMatch = allowedOrigins.includes(normalizedRequestOrigin);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedRequestOrigin);

    if (
      isWildcard ||
      isExplicitMatch ||
      (isDevelopment && isLocalhost) ||
      (isLocalhost && allowedOrigins.length === 0)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
app.use(authenticateRequest);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'course-builder',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/courses', coursesRoutes);
app.use('/api/v1', feedbackRoutes);
app.use('/api/v1', inputRoutes);
app.use('/api/v1/lessons', lessonsRoutes);
// Unified integration endpoint: POST /api/fill-content-metrics
app.use('/api', integrationRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/enrichment', enrichmentAssetsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
let serverInstance;

if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`🚀 Course Builder API server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

export const server = serverInstance;
export default app;


