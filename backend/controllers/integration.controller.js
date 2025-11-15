/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';

/**
 * Unified integration endpoint handler
 * POST /api/fill-content-metrics
 * 
 * Accepts:
 *   - serviceName: string (e.g., "ContentStudio", "LearnerAI")
 *   - payload: stringified JSON
 * 
 * Returns:
 *   {
 *     "serviceName": "<same>",
 *     "payload": "<stringified JSON>"
 *   }
 */
export async function handleFillContentMetrics(req, res, next) {
  try {
    const { serviceName, payload } = req.body;

    // Validate required fields
    if (!serviceName || typeof serviceName !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'serviceName is required and must be a string'
      });
    }

    if (!payload || typeof payload !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'payload is required and must be a stringified JSON'
      });
    }

    // Parse payload safely
    let payloadObject;
    try {
      payloadObject = JSON.parse(payload);
    } catch (parseError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'payload must be valid JSON string',
        details: parseError.message
      });
    }

    // Dispatch to appropriate handler
    const responseObject = await dispatchIntegrationRequest(serviceName, payloadObject);

    // Return response in exact same structure
    res.status(200).json({
      serviceName: serviceName,
      payload: JSON.stringify(responseObject)
    });
  } catch (error) {
    console.error('[Integration Controller] Error:', error);
    
    // Handle unsupported service - return 400
    if (error.message && error.message.includes('Unsupported service')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        serviceName: req.body?.serviceName || 'Unknown'
      });
    }
    
    // Return error in unified format
    const errorResponse = {
      serviceName: req.body?.serviceName || 'Unknown',
      error: error.message || 'Internal Server Error',
      status: 'error'
    };

    res.status(error.status || 500).json({
      serviceName: errorResponse.serviceName,
      payload: JSON.stringify(errorResponse)
    });
  }
}

export default {
  handleFillContentMetrics
};
