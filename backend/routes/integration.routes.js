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
 * Request Body (regular JSON object):
 *   {
 *     "requester_service": "course_builder", // Service name making the request (lowercase with underscores)
 *     "payload": { "key": "value" }, // JSON object - data sent to target microservice
 *     "response": { "field1": "", "field2": [] } // JSON object - template for expected response structure
 *   }
 * 
 * Note: Routing to target microservice is determined internally from payload structure.
 * 
 * Response (regular JSON object):
 *   {
 *     "requester_service": "course_builder",
 *     "payload": { ... }, // Same as request payload
 *     "response": { "field1": "filled", "field2": [...] } // Filled by service
 *   }
 */
router.post('/fill-content-metrics', integrationController.handleFillContentMetrics);

export default router;
