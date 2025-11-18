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
 *     "requester_service": "CourseBuilder", // Always "CourseBuilder" - identifies who is making the request
 *     "payload": "{\"key\": \"value\"}", // stringified JSON - data sent to target microservice
 *     "response": "{\"field1\": \"\", \"field2\": []}" // stringified JSON - template for expected response structure
 *   }
 * 
 * Note: Routing to target microservice is determined internally from payload structure.
 * 
 * Response (stringified JSON):
 *   {
 *     "requester_service": "CourseBuilder",
 *     "payload": "<same as request>", // stringified JSON
 *     "response": "{\"field1\": \"filled\", \"field2\": [...]}" // stringified JSON (filled by service)
 *   }
 */
router.post('/fill-content-metrics', integrationController.handleFillContentMetrics);

export default router;
