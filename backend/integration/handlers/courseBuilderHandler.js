/**
 * Course Builder Handler
 * Handles ALL Course Builder requests via AI in two modes:
 * 1. Data-Filling Mode: Reads data and fills structured response templates
 * 2. Action/Command Mode: Performs operations (INSERT/UPDATE/DELETE) and returns {} or {answer: "OK"}
 * 
 * Always returns: { action, payload, response } with filled response
 */

import { fillContentMetrics } from '../../services/fillContentMetrics.service.js';

/**
 * Check if response template is Action/Command mode
 * Action mode: {} or { "answer": "" }
 * @param {Object} responseTemplate - Response template to check
 * @returns {boolean} - True if action mode
 */
function isActionMode(responseTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return true; // Empty/null is action mode
  }
  
  const keys = Object.keys(responseTemplate);
  
  // Empty object is action mode
  if (keys.length === 0) {
    return true;
  }
  
  // Only "answer" field is action mode
  if (keys.length === 1 && keys[0] === 'answer') {
    const answerValue = responseTemplate.answer;
    // Empty string, null, or undefined means action mode
    if (answerValue === '' || answerValue === null || answerValue === undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if response template is Data-Filling mode
 * Data mode: multiple fields, nested objects, arrays, structured data
 * @param {Object} responseTemplate - Response template to check
 * @returns {boolean} - True if data-filling mode
 */
function isDataFillingMode(responseTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return false;
  }
  
  const keys = Object.keys(responseTemplate);
  
  // Empty is not data mode
  if (keys.length === 0) {
    return false;
  }
  
  // Only "answer" is not data mode
  if (keys.length === 1 && keys[0] === 'answer') {
    return false;
  }
  
  // Multiple fields or structured data is data mode
  return true;
}

/**
 * Handle Course Builder integration requests
 * Uses AI to generate SQL queries (SELECT for data mode, INSERT/UPDATE/DELETE for action mode)
 * and fill response templates
 * 
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Response template to fill
 * @param {string|null} action - Action from payload.action (optional)
 * @param {string} requesterService - Requester service name (from envelope)
 * @param {string|null} requestId - Request ID for logging (optional)
 * @returns {Promise<Object>} - Full request object: { requester_service, payload, response }
 */
export async function handleCourseBuilderIntegration(payloadObject, responseTemplate, action = null, requesterService = null, requestId = null) {
  const logPrefix = requestId ? `[Course Builder Handler] [${requestId}]` : '[Course Builder Handler]';
  const startTime = Date.now();
  
  try {
    console.log(`${logPrefix} 🚀 Starting Course Builder handler`);
    
    // Extract action from payload if not provided
    const actionToUse = action || payloadObject.action || null;
    
    // Determine mode
    const isAction = isActionMode(responseTemplate);
    const isData = isDataFillingMode(responseTemplate);
    const mode = isAction ? 'Action/Command' : isData ? 'Data-Filling' : 'Unknown';
    
    console.log(`${logPrefix} 📋 Request Details:`);
    console.log(`${logPrefix}   - Mode: ${mode}`);
    console.log(`${logPrefix}   - Action: ${actionToUse || 'N/A'}`);
    console.log(`${logPrefix}   - Requester Service: ${requesterService || 'N/A'}`);
    console.log(`${logPrefix}   - Payload:`, JSON.stringify(payloadObject, null, 2));
    console.log(`${logPrefix}   - Response Template:`, JSON.stringify(responseTemplate, null, 2));

    // Use AI-powered service to fill the template
    // AI will determine SQL type based on mode
    console.log(`${logPrefix} ⏳ Calling fillContentMetrics service...`);
    const serviceStartTime = Date.now();
    const filledTemplate = await fillContentMetrics(payloadObject, responseTemplate, actionToUse, isAction, requestId);
    const serviceDuration = Date.now() - serviceStartTime;
    console.log(`${logPrefix} ✅ fillContentMetrics completed in ${serviceDuration}ms`);

    console.log(`${logPrefix} 📦 Filled Template:`, JSON.stringify(filledTemplate, null, 2));

    // Return the same request object with filled response
    // Contract: { requester_service, payload, response }
    // Must preserve exact structure - only response is filled
    const result = {
      requester_service: requesterService || 'course_builder', // Preserve original requester_service
      payload: payloadObject, // Keep original payload unchanged (includes action inside)
      response: filledTemplate || {} // Return filled response template
    };
    
    const totalDuration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ Handler completed in ${totalDuration}ms`);
    console.log(`${logPrefix} 📤 Returning envelope with filled response`);
    
    return result;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ ERROR after ${totalDuration}ms:`, error);
    console.error(`${logPrefix} Error stack:`, error.stack);
    throw new Error(`Course Builder handler failed: ${error.message}`);
  }
}

export default {
  handleCourseBuilderIntegration
};
