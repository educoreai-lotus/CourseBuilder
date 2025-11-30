/**
 * Tests for Rate Limiting Middleware
 */

import request from 'supertest';
import express from 'express';
import { apiLimiter, authLimiter, courseCreationLimiter, feedbackLimiter } from '../middleware/rateLimiter.middleware.js';

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('apiLimiter', () => {
    it('should allow requests within limit', async () => {
      app.get('/test', apiLimiter, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should skip rate limiting for health checks', async () => {
      app.get('/health', apiLimiter, (req, res) => {
        res.json({ status: 'healthy' });
      });

      // Make many requests to health endpoint
      for (let i = 0; i < 150; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }
    });
  });

  describe('authLimiter', () => {
    it('should limit authentication attempts', async () => {
      app.post('/auth', authLimiter, (req, res) => {
        res.json({ token: 'test-token' });
      });

      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth')
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/auth')
        .expect(429);

      expect(response.body.error).toBe('Too many authentication attempts');
    });
  });

  describe('courseCreationLimiter', () => {
    it('should limit course creation requests', async () => {
      app.post('/courses', courseCreationLimiter, (req, res) => {
        res.json({ id: 'course-1' });
      });

      // Make requests up to limit (10 per hour)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/courses')
          .send({ name: `Course ${i}` })
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/courses')
        .send({ name: 'Course 11' })
        .expect(429);

      expect(response.body.error).toBe('Too many course creation requests');
    });
  });

  describe('feedbackLimiter', () => {
    it('should limit feedback submissions', async () => {
      app.post('/feedback', feedbackLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to limit (20 per hour)
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/feedback')
          .send({ rating: 5 })
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/feedback')
        .send({ rating: 5 })
        .expect(429);

      expect(response.body.error).toBe('Too many feedback submissions');
    });
  });
});

