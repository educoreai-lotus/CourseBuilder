import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import coursesRoutes from './routes/courses.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import inputRoutes from './routes/input.routes.js';

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

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigin = normalizeOrigin(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*');
    const normalizedRequestOrigin = origin ? normalizeOrigin(origin) : origin;
    
    if (allowedOrigin === '*' || normalizedRequestOrigin === allowedOrigin) {
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
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Course Builder API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;


