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
 * Determine target service based on response template and payload
 * NEW LOGIC: Course Builder handles ALL requests with response templates via AI
 * 
 * @param {Object} payloadObject - Payload from request
 * @param {Object} responseTemplate - Response template from request
 * @returns {string|null} - Target service name or null
 */
function determineTargetService(payloadObject, responseTemplate) {
  // NEW ROUTING LOGIC:
  // 1. If response template exists (even if empty or {answer: ""}) → Use Course Builder Handler (AI)
  // 2. If response template is missing → Use specialized handler based on payload structure
  
  // Check if response template exists (even if empty)
  if (responseTemplate !== undefined && responseTemplate !== null) {
    // Response template exists → Use AI-powered Course Builder Handler
    // AI will determine if it's Data-Filling or Action mode
    return 'CourseBuilder';
  }
  
  // Response template is missing → Use specialized handler based on payload structure
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
    // Request body comes as a string from Coordinator - we need to parse it manually
    let envelope;
    
    // Check if body is already parsed (object) or still a string
    if (typeof req.body === 'string') {
      // Body is a string - parse it to JSON
      try {
        envelope = JSON.parse(req.body);
      } catch (parseError) {
        const errorPayload = {
          error: 'Bad Request',
          message: 'Request body must be a valid JSON string'
        };
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json(errorPayload);
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      // Body is already parsed (fallback if Express.json() parsed it)
      envelope = req.body;
    } else {
      // Try to get raw body as string
      const rawBody = req.body?.toString() || '';
      if (!rawBody) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Request body is empty or invalid'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).send(JSON.stringify(errorPayload));
      }
      try {
        envelope = JSON.parse(rawBody);
      } catch (parseError) {
        const errorPayload = {
          error: 'Bad Request',
          message: 'Request body must be a valid JSON string'
        };
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json(errorPayload);
      }
    }

    // Validate envelope is an object after parsing
    if (!envelope || typeof envelope !== 'object') {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Request body must be a valid JSON object'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).send(JSON.stringify(errorPayload));
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
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Payload and response are already objects (NOT stringified)
    // Response can be undefined for one-way communications (Learner AI, Directory, etc.)
    const payloadObject = envelope.payload;
    const responseObject = envelope.response || {};  // Default to {} if response is missing

    // Extract action from payload.action (action is inside payload, not top-level)
    const action = payloadObject.action || null;
    
    // Determine target service based on NEW routing logic:
    // - If response template exists → Course Builder Handler (AI) - handles both Data and Action modes
    // - If response template is missing → Specialized handler based on payload structure
    console.log('[Integration Controller] 🔍 Determining target service...');
    console.log('[Integration Controller] Action (from payload.action):', action);
    console.log('[Integration Controller] Response template mode:', 
      isActionMode(responseObject) ? 'Action/Command' : 
      isDataFillingMode(responseObject) ? 'Data-Filling' : 'Empty/Missing');
    const targetService = determineTargetService(payloadObject, responseObject);
    console.log('[Integration Controller] ✅ Target service determined:', targetService);
    
    if (!targetService) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Could not determine target service. Please ensure payload matches a known service pattern, or provide a response template with fields to fill.'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Call dispatcher with target service, payload, and response template
    console.log(`[Integration Controller] 📤 Routing to ${targetService} handler...`);
    if (targetService === 'CourseBuilder') {
      const mode = isActionMode(responseObject) ? 'Action/Command' : 'Data-Filling';
      console.log(`[Integration Controller] 🤖 Using AI-powered Course Builder Handler (${mode} mode)`);
    }
    const filledResponse = await dispatchIntegrationRequest(targetService, payloadObject, responseObject, action, requesterService);
    console.log(`[Integration Controller] ✅ ${targetService} handler completed successfully`);

    // For Course Builder AI handler: it returns the full request object with filled response
    // For other handlers: they return just the filled response object
    let responseEnvelope;
    if (targetService === 'CourseBuilder' && filledResponse && filledResponse.requester_service) {
      // AI handler returned full object: { requester_service, payload, response }
      // Use it as-is (exact same structure - only response is filled)
      responseEnvelope = filledResponse;
    } else {
      // Handler returns the filled response object
      // Response is already a regular object (NOT stringified)
      // For one-way communications (Learner AI, Directory, etc.), filledResponse will be {}
      
      // Return only the three fields: requester_service, payload, response
      // Routing information (target_service) is internal and not exposed
      responseEnvelope = {
        requester_service: envelope.requester_service, // Keep original requester_service
        payload: payloadObject, // Keep original payload
        response: filledResponse || {} // Return filled response object (or {} for one-way)
      };
    }

    // Return the full envelope as JSON string (Coordinator expects string)
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(responseEnvelope));
  } catch (error) {
    console.error('[Integration Controller] Error processing request:', error);
    const status = error.status || 500;
    const errorPayload = {
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message: error.message || 'Unhandled error'
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).send(JSON.stringify(errorPayload));
  }
}

export default {
  handleFillContentMetrics
};
