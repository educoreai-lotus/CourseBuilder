/**
 * Unified Integration Routes
 * Single endpoint for all microservice integrations
 */

import express from 'express';
import integrationController from '../controllers/integration.controller.js';

const router = express.Router();

/**
 * POST /api/fill-content-metrics
 * Unified endpoint for all microservice integrations
 * 
 * Body:
 *   {
 *     "serviceName": "ContentStudio" | "LearnerAI" | "Assessment" | etc.,
 *     "payload": "{\"key\": \"value\"}" // stringified JSON
 *   }
 * 
 * Response:
 *   {
 *     "serviceName": "<same>",
 *     "payload": "{\"status\": \"success\", ...}" // stringified JSON
 *   }
 */
router.post('/fill-content-metrics', integrationController.handleFillContentMetrics);

export default router;
