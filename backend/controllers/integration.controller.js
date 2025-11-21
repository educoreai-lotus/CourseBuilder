/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 * Implements shared envelope structure with regular JSON objects (not stringified).
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';

/**
 * Check if response template has fields to fill
 * Response template has fields if it's an object with at least one key
 * @param {Object} responseTemplate - Response template to check
 * @returns {boolean} - True if template has fields to fill
 */
function responseTemplateHasFields(responseTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return false;
  }
  
  // Check if it has at least one key
  const keys = Object.keys(responseTemplate);
  if (keys.length === 0) {
    return false;
  }
  
  // Check if any value is not null/undefined/empty string (indicating a field to fill)
  // Empty arrays and empty objects are considered "fields to fill"
  for (const key of keys) {
    const value = responseTemplate[key];
    // If value is not null/undefined, it's a field to fill (even if empty array/object)
    if (value !== null && value !== undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * Infer specialized service from payload structure
 * Used only when response template is empty (no AI needed)
 * Determines which specialized handler to use based on payload content
 */
function inferSpecializedServiceFromPayload(payloadObject) {
  if (!payloadObject || typeof payloadObject !== 'object') {
    return null;
  }
  
  // ContentStudio: has topics[] or learner_id + skills
  if (payloadObject.topics || (payloadObject.learner_id && payloadObject.skills)) {
    return 'ContentStudio';
  }
  
  // LearnerAI: has user_id, company_id, skills, competency_name
  if (payloadObject.user_id || payloadObject.competency_name) {
    return 'LearnerAI';
  }
  
  // Assessment: has coverage_map
  if (payloadObject.coverage_map) {
    return 'Assessment';
  }
  
  // Directory: has feedback object
  if (payloadObject.feedback && typeof payloadObject.feedback === 'object') {
    return 'Directory';
  }
  
  // SkillsEngine: has topic (string)
  if (payloadObject.topic && typeof payloadObject.topic === 'string') {
    return 'SkillsEngine';
  }
  
  // LearningAnalytics: has course_type, enrollment, feedback, assessments
  if (payloadObject.course_type || payloadObject.enrollment || payloadObject.assessments) {
    return 'LearningAnalytics';
  }
  
  // ManagementReporting: has totalEnrollments, activeEnrollment, completionRate
  if (payloadObject.totalEnrollments !== undefined || payloadObject.completionRate !== undefined) {
    return 'ManagementReporting';
  }
  
  // Devlab: has course_id, learner_id, course_name (minimal payload)
  if (payloadObject.course_id && payloadObject.learner_id && payloadObject.course_name) {
    return 'Devlab';
  }
  
  return null;
}

/**
 * Determine target service based on response template and payload
 * NEW LOGIC: AI is used ONLY when response template has fields to fill
 * 
 * @param {Object} payloadObject - Payload from request
 * @param {Object} responseTemplate - Response template from request
 * @returns {string|null} - Target service name or null
 */
function determineTargetService(payloadObject, responseTemplate) {
  // NEW ROUTING LOGIC:
  // 1. If response template has fields → Use Course Builder Handler (AI)
  // 2. If response template is empty → Use specialized handler based on payload structure
  
  // Check if response template has fields to fill
  if (responseTemplateHasFields(responseTemplate)) {
    // Response template has fields → Use AI-powered Course Builder Handler
    return 'CourseBuilder';
  }
  
  // Response template is empty → Use specialized handler based on payload structure
  return inferSpecializedServiceFromPayload(payloadObject);
}


/**
 * Unified integration endpoint handler
 * POST /api/fill-content-metrics
 *
 * Contract rules:
 * 1) Request body is a regular JSON object (parsed by Express.json() middleware)
 * 2) Must contain requester_service (string, lowercase with underscores, e.g., "course_builder"), payload (JSON object), response (JSON object)
 * 3) Both payload and response are regular JSON objects (NOT stringified)
 * 4) Infer target service from payload structure (routing is internal)
 * 5) Route to appropriate handler, pass parsed payload and response template
 * 6) Handler fills the response template and returns it
 * 7) Return the full envelope as regular JSON object (only requester_service, payload, response)
 * 8) On parse/validation error: respond 400 with JSON error
 */
export async function handleFillContentMetrics(req, res) {
  try {
    // Body should be a regular JSON object (parsed by Express.json() middleware)
    const envelope = req.body;

    // Validate body is an object
    if (!envelope || typeof envelope !== 'object') {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Request body must be a valid JSON object'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json(errorPayload);
    }

    // Validate required fields and structure
    // requester_service and payload are required
    // response is optional (for one-way communications like Learner AI, Directory, etc.)
    const requesterService = envelope.requester_service;
    const hasRequesterService = typeof requesterService === 'string' && requesterService.trim().length > 0;
    const hasPayload = envelope.payload && typeof envelope.payload === 'object';
    const hasResponse = envelope.response !== undefined;  // Response is optional (can be {} or missing)

    if (!hasRequesterService || !hasPayload) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Envelope must include "requester_service" (string, lowercase with underscores) and "payload" (JSON object). "response" is optional (can be {} or omitted for one-way communications).'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json(errorPayload);
    }

    // Payload and response are already objects (NOT stringified)
    // Response can be undefined for one-way communications (Learner AI, Directory, etc.)
    const payloadObject = envelope.payload;
    const responseObject = envelope.response || {};  // Default to {} if response is missing

    // Determine target service based on NEW routing logic:
    // - If response template has fields → Course Builder Handler (AI)
    // - If response template is empty → Specialized handler based on payload structure
    console.log('[Integration Controller] 🔍 Determining target service...');
    console.log('[Integration Controller] Response template has fields:', responseTemplateHasFields(responseObject));
    const targetService = determineTargetService(payloadObject, responseObject);
    console.log('[Integration Controller] ✅ Target service determined:', targetService);
    
    if (!targetService) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Could not determine target service. Please ensure payload matches a known service pattern, or provide a response template with fields to fill.'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json(errorPayload);
    }

    // Call dispatcher with target service, payload, and response template
    console.log(`[Integration Controller] 📤 Routing to ${targetService} handler...`);
    if (targetService === 'CourseBuilder') {
      console.log('[Integration Controller] 🤖 Using AI-powered Course Builder Handler (Gemini AI will be called)');
    }
    const filledResponse = await dispatchIntegrationRequest(targetService, payloadObject, responseObject);
    console.log(`[Integration Controller] ✅ ${targetService} handler completed successfully`);

    // Handler returns the filled response object
    // Response is already a regular object (NOT stringified)
    // For one-way communications (Learner AI, Directory, etc.), filledResponse will be {}
    
    // Return only the three fields: requester_service, payload, response
    // Routing information (target_service) is internal and not exposed
    const responseEnvelope = {
      requester_service: envelope.requester_service, // Keep original requester_service
      payload: payloadObject, // Keep original payload
      response: filledResponse || {} // Return filled response object (or {} for one-way)
    };

    // Return the full envelope as regular JSON object
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(responseEnvelope);
  } catch (error) {
    console.error('[Integration Controller] Error processing request:', error);
    const status = error.status || 500;
    const errorPayload = {
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message: error.message || 'Unhandled error'
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(errorPayload);
  }
}

export default {
  handleFillContentMetrics
};
