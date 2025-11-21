/**
 * Course Builder Handler
 * Handles requests where Course Builder needs to fill response templates
 * with data from its own database using AI-generated SQL queries
 * 
 * This handler is called ONLY when response template has fields to fill.
 * If response template is empty, the request is routed to specialized handlers.
 */

import { fillContentMetrics } from '../../services/fillContentMetrics.service.js';

/**
 * Check if response template has fields to fill
 * @param {Object} responseTemplate - Response template to check
 * @returns {boolean} - True if template has fields
 */
function responseTemplateHasFields(responseTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return false;
  }
  
  const keys = Object.keys(responseTemplate);
  if (keys.length === 0) {
    return false;
  }
  
  // Check if any value is not null/undefined (indicating a field to fill)
  for (const key of keys) {
    const value = responseTemplate[key];
    if (value !== null && value !== undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * Handle Course Builder integration requests
 * Uses AI to generate SQL queries and fill response templates
 * 
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Response template to fill (must have fields)
 * @returns {Promise<Object>} - Filled response template
 */
export async function handleCourseBuilderIntegration(payloadObject, responseTemplate) {
  try {
    console.log('[Course Builder Handler] Processing request with AI-powered query generation');
    console.log('[Course Builder Handler] Payload:', JSON.stringify(payloadObject, null, 2));
    console.log('[Course Builder Handler] Response Template:', JSON.stringify(responseTemplate, null, 2));

    // Safety check: Ensure response template has fields to fill
    // This should not happen due to routing logic, but adding as defensive check
    if (!responseTemplateHasFields(responseTemplate)) {
      console.warn('[Course Builder Handler] Response template is empty, returning empty object');
      return {};
    }

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
