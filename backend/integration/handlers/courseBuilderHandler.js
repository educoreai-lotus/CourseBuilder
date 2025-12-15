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
 * Check if action is a write operation (enrollment, registration, etc.)
 * @param {string|null} action - Action from payload
 * @returns {boolean} - True if action requires write operation
 */
function isWriteAction(action) {
  if (!action || typeof action !== 'string') {
    return false;
  }
  
  const writeActionPatterns = [
    'enroll',
    'register',
    'create',
    'update',
    'delete',
    'cancel',
    'submit',
    'assign'
  ];
  
  const lowerAction = action.toLowerCase();
  return writeActionPatterns.some(pattern => lowerAction.includes(pattern));
}

/**
 * Check if response template is Action/Command mode
 * Action mode: {} or { "answer": "" } OR response template with action result fields (success, message, etc.)
 * @param {Object} responseTemplate - Response template to check
 * @param {string|null} action - Action from payload (optional, for detecting write operations)
 * @returns {boolean} - True if action mode
 */
function isActionMode(responseTemplate, action = null) {
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
  
  // If action is a write operation (enroll, register, etc.) and response has action result fields,
  // treat as Action mode even if it has structured fields
  if (action && isWriteAction(action)) {
    // Check if response template has action result fields (success, message, etc.)
    const actionResultFields = ['success', 'message', 'error', 'status', 'result'];
    const hasActionResultFields = keys.some(key => actionResultFields.includes(key.toLowerCase()));
    
    if (hasActionResultFields) {
      return true; // This is an action that returns a result, not a data query
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
 * @returns {Promise<Object>} - Full request object: { requester_service, payload, response }
 */
export async function handleCourseBuilderIntegration(payloadObject, responseTemplate, action = null, requesterService = null) {
  try {
    // Extract action from payload if not provided
    const actionToUse = action || payloadObject.action || null;
    
    // Determine mode (pass action to isActionMode to detect write operations)
    const isAction = isActionMode(responseTemplate, actionToUse);
    const isData = isDataFillingMode(responseTemplate);
    const mode = isAction ? 'Action/Command' : isData ? 'Data-Filling' : 'Unknown';
    
    console.log('[Course Builder Handler] Processing request with AI-powered query generation');
    console.log('[Course Builder Handler] Mode:', mode);
    console.log('[Course Builder Handler] Action (from payload.action):', actionToUse);
    console.log('[Course Builder Handler] Requester Service:', requesterService);
    console.log('[Course Builder Handler] Payload:', JSON.stringify(payloadObject, null, 2));
    console.log('[Course Builder Handler] Response Template:', JSON.stringify(responseTemplate, null, 2));

    // Use AI-powered service to fill the template
    // AI will determine SQL type based on mode
    // Pass requesterService for flow gate validation
    const filledTemplate = await fillContentMetrics(payloadObject, responseTemplate, actionToUse, isAction, requesterService);

    console.log('[Course Builder Handler] Filled template:', JSON.stringify(filledTemplate, null, 2));

    // Return the same request object with filled response
    // Contract: { requester_service, payload, response }
    // Must preserve exact structure - only response is filled
    return {
      requester_service: requesterService || 'course_builder', // Preserve original requester_service
      payload: payloadObject, // Keep original payload unchanged (includes action inside)
      response: filledTemplate || {} // Return filled response template
    };
  } catch (error) {
    console.error('[Course Builder Handler] Error:', error);
    throw new Error(`Course Builder handler failed: ${error.message}`);
  }
}

export default {
  handleCourseBuilderIntegration
};
