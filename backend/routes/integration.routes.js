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
 * Request Body (stringified JSON):
 *   {
 *     "serviceName": "ContentStudio" | "LearnerAI" | "Assessment" | etc.,
 *     "payload": "{\"key\": \"value\"}", // stringified JSON
 *     "response": "{\"field1\": \"\", \"field2\": []}" // stringified JSON (empty template)
 *   }
 * 
 * Response (stringified JSON):
 *   {
 *     "serviceName": "<same>",
 *     "payload": "<same as request>", // stringified JSON
 *     "response": "{\"field1\": \"filled\", \"field2\": [...]}" // stringified JSON (filled by service)
 *   }
 */
router.post('/fill-content-metrics', integrationController.handleFillContentMetrics);

export default router;
