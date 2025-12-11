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
 * Request Body (JSON string - Coordinator sends as string):
 *   String: '{"requester_service":"content_studio","payload":{"action":"...","key":"value"},"response":{"field1":"","field2":[]}}'
 * 
 * After parsing:
 *   {
 *     "requester_service": "content_studio", // Service name making the request (lowercase with underscores)
 *     "payload": { "action": "...", "key": "value" }, // JSON object - data sent to target microservice
 *     "response": { "field1": "", "field2": [] } // JSON object - template for expected response structure (optional)
 *   }
 * 
 * Routing Logic:
 * - If response template has fields to fill → Course Builder Handler (AI-powered SQL generation)
 * - If response template is empty {} → Specialized handler based on payload structure (ContentStudio, Assessment, etc.)
 * 
 * Response (JSON string - Course Builder returns as string):
 *   String: '{"requester_service":"content_studio","payload":{...},"response":{...}}'
 */
// Use express.text() to receive body as string, then parse manually in controller
router.post('/fill-content-metrics', express.text({ type: 'application/json' }), integrationController.handleFillContentMetrics);

export default router;
