/**
 * Unified Integration Routes
 * Single endpoint for all microservice integrations
 */

import express from 'express';
import integrationController from '../controllers/integration.controller.js';
import { fillContentMetricsRateGate } from '../middleware/trainerPublishRateLimit.middleware.js';

const router = express.Router();

/**
 * POST /api/fill-content-metrics
 *
 * Body parsing: server.js mounts express.json({ limit: '256kb' }) for this path
 * before the default 100kb parser so max-size CHUNK envelopes are accepted only here.
 *
 * Rate limiting: fillContentMetricsRateGate
 * - Coordinator-authenticated Chunked Trainer Publish → 600 / 15 min / IP
 * - Full AI / legacy / spoofed TP actions → 100 / 15 min / IP (unchanged policy)
 * Global apiLimiter skips this path by URL only (never by payload action).
 */
router.post(
  '/fill-content-metrics',
  fillContentMetricsRateGate,
  integrationController.handleFillContentMetrics
);

export default router;
