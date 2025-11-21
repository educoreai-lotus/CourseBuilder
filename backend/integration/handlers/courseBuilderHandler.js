/**
 * Course Builder Handler
 * Handles requests where Course Builder needs to fill response templates
 * with data from its own database using AI-generated SQL queries
 */

import { fillContentMetrics } from '../../services/fillContentMetrics.service.js';

/**
 * Handle Course Builder integration requests
 * Uses AI to generate SQL queries and fill response templates
 * 
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Response template to fill
 * @returns {Promise<Object>} - Filled response template
 */
export async function handleCourseBuilderIntegration(payloadObject, responseTemplate) {
  try {
    console.log('[Course Builder Handler] Processing request with AI-powered query generation');
    console.log('[Course Builder Handler] Payload:', JSON.stringify(payloadObject, null, 2));
    console.log('[Course Builder Handler] Response Template:', JSON.stringify(responseTemplate, null, 2));

    // Use AI-powered service to fill the template
    const filledTemplate = await fillContentMetrics(payloadObject, responseTemplate);

    console.log('[Course Builder Handler] Filled template:', JSON.stringify(filledTemplate, null, 2));

    return filledTemplate;
  } catch (error) {
    console.error('[Course Builder Handler] Error:', error);
    throw new Error(`Course Builder handler failed: ${error.message}`);
  }
}

export default {
  handleCourseBuilderIntegration
};
