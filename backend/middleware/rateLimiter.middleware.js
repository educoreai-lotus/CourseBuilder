/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
/** Unchanged global policy for all /api routes except fill-content-metrics (see skip). */
export const API_RATE_LIMIT_MAX = 100;
export const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip validation warnings for trust proxy (we trust Railway's proxy)
  validate: {
    trustProxy: false // Disable trust proxy validation warning
  },
  skip: (req) => {
    // Health is outside /api; kept for safety if mount changes.
    if (req.path === '/health') {
      return true;
    }
    // POST /api/fill-content-metrics is rate-limited by fillContentMetricsRateGate
    // (path-only skip — never based on payload action). That gate applies the
    // standard 100/15min policy unless Coordinator ECDSA proves Trainer Publish.
    const path = req.path || '';
    return (
      path === '/fill-content-metrics' ||
      path.endsWith('/fill-content-metrics')
    );
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Course creation rate limiter
 * 10 requests per hour per IP
 */
export const courseCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 course creations per hour
  message: {
    error: 'Too many course creation requests',
    message: 'Too many course creation requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Feedback submission rate limiter
 * 20 requests per hour per IP
 */
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 feedback submissions per hour
  message: {
    error: 'Too many feedback submissions',
    message: 'Too many feedback submissions from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default {
  apiLimiter,
  authLimiter,
  courseCreationLimiter,
  feedbackLimiter
};

