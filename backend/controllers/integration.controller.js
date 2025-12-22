/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 * Implements shared envelope structure with regular JSON objects (not stringified).
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';
import { PendingCourseCreationError } from '../utils/PendingCourseCreationError.js';

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
  
  // ⚠️ CRITICAL: Check Assessment FIRST (before ContentStudio/LearnerAI) because Assessment requests are more specific
  // Assessment: has action "coverage map" (or "coverage_map" with underscore) or exam result fields
  // Note: requester_service is not in payloadObject, it's in envelope, so we check action and exam result fields
  const action = payloadObject.action ? payloadObject.action.toLowerCase().trim() : null;
  // Handle both "coverage map" (space) and "coverage_map" (underscore) formats
  const isCoverageMapAction = action === 'coverage map' || 
                               action === 'coverage_map' || 
                               action === 'coverge map' || // Handle typo
                               action === 'coverge_map';   // Handle typo with underscore
  const hasExamResultFields = payloadObject.final_grade !== undefined || 
                               payloadObject.passed !== undefined ||
                               (payloadObject.exam_type && payloadObject.passing_grade !== undefined);
  
  // Also check for Assessment request pattern: course_id + learner_id (coverage map request pattern)
  // This helps catch Assessment requests even if action is wrong (e.g., "generate_course_content")
  const hasAssessmentPattern = payloadObject.course_id && 
                                (payloadObject.learner_id || payloadObject.user_id) &&
                                !payloadObject.topics && // Not ContentStudio (has topics)
                                !payloadObject.skills && // Not ContentStudio (has skills)
                                !payloadObject.competency_name && // Not LearnerAI
                                !payloadObject.learning_path; // Not LearnerAI
  
  if (isCoverageMapAction || hasExamResultFields || hasAssessmentPattern) {
    console.log('[Integration Controller] 🎯 Assessment service detected:', {
      action,
      isCoverageMapAction,
      hasExamResultFields,
      hasAssessmentPattern,
      course_id: payloadObject.course_id,
      learner_id: payloadObject.learner_id || payloadObject.user_id
    });
    return 'Assessment';
  }
  
  // ContentStudio: has topics[] or learner_id + skills
  if (payloadObject.topics || (payloadObject.learner_id && payloadObject.skills)) {
    return 'ContentStudio';
  }
  
  // LearnerAI: has user_id, company_id, skills, competency_name
  if (payloadObject.user_id || payloadObject.competency_name) {
    return 'LearnerAI';
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
 * Determine target service based on response template and payload
 * NEW LOGIC: 
 * - If response template has structured fields → Course Builder Handler (Data-Filling mode)
 * - If response template is {} or {answer: ""} → Check payload first for specialized handlers, otherwise Course Builder (Action mode)
 * - If response template is missing → Use specialized handler based on payload structure
 * 
 * @param {Object} payloadObject - Payload from request
 * @param {Object} responseTemplate - Response template from request
 * @returns {string|null} - Target service name or null
 */
function determineTargetService(payloadObject, responseTemplate) {
  // NEW ROUTING LOGIC:
  // 1. If response template is missing → Use specialized handler based on payload structure
  // 2. If response template is {} or {answer: ""} → Check payload for specialized handlers first, otherwise Course Builder (Action mode)
  // 3. If response template has structured fields → Course Builder Handler (Data-Filling mode)
  
  // Check if response template is missing
  if (responseTemplate === undefined || responseTemplate === null) {
    // Response template is missing → Use specialized handler based on payload structure
    return inferSpecializedServiceFromPayload(payloadObject);
  }
  
  // Extract action for mode detection
  const action = payloadObject.action || null;
  
  // Response template exists - check if it's Action mode or Data mode
  if (isActionMode(responseTemplate, action)) {
    // Action mode: {} or {answer: ""} OR write operations with result fields
    // First, check if payload matches a specialized handler pattern
    // If yes, use that handler (specialized handlers can handle empty response)
    // IMPORTANT: Check specialized services FIRST before defaulting to CourseBuilder
    const specializedService = inferSpecializedServiceFromPayload(payloadObject);
    if (specializedService) {
      console.log(`[Integration Controller] 🎯 Specialized service detected: ${specializedService} (overriding Action mode default)`);
      return specializedService;
    }
    // Empty {} response for write operations must execute (command-only request)
    // But only if it's a recognized write operation (has action that's a write)
    // If no action or action is not a write, and no specialized service matches, return null (400)
    if (action && isWriteAction(action)) {
      // Write operation with empty response - route to CourseBuilder Action mode
      return 'CourseBuilder';
    }
    // Empty {} with no recognized action and no specialized service - cannot determine target
    if (Object.keys(responseTemplate).length === 0) {
      return null; // Will trigger 400 error
    }
    // If response is {answer: ""} or write operation with result fields, try Course Builder Action mode
    return 'CourseBuilder';
  } else if (isDataFillingMode(responseTemplate)) {
    // Data mode: structured fields
    // Always use Course Builder Data-Filling mode
    return 'CourseBuilder';
  }
  
  // Fallback: shouldn't reach here, but default to Course Builder
  return 'CourseBuilder';
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
    console.log('[Integration Controller] Requester Service:', requesterService);
    console.log('[Integration Controller] Action (from payload.action):', action);
    const responseMode = isActionMode(responseObject, action) ? 'Action/Command' : 
                        isDataFillingMode(responseObject) ? 'Data-Filling' : 'Empty/Missing';
    console.log('[Integration Controller] Response template mode:', responseMode);
    
    // ⚠️ CRITICAL: If requester_service is "assessment-service", route to Assessment handler immediately
    // This prevents misrouting when Assessment sends requests with wrong action (e.g., "generate_course_content")
    const normalizedRequester = requesterService ? requesterService.toLowerCase().trim() : '';
    let targetService;
    if (normalizedRequester === 'assessment-service') {
      console.log('[Integration Controller] 🎯 Requester is assessment-service - routing to Assessment handler');
      targetService = 'Assessment';
    } else {
      targetService = determineTargetService(payloadObject, responseObject);
    }
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
      const mode = isActionMode(responseObject, action) ? 'Action/Command' : 'Data-Filling';
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
    
    // Handle pending course creation (202 Accepted)
    if (error instanceof PendingCourseCreationError) {
      console.log('[Integration Controller] Course creation pending - returning 202 Accepted');
      const pendingPayload = {
        status: 'PENDING',
        reason: error.reason || error.message || 'Course creation is pending'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(202).send(JSON.stringify(pendingPayload));
    }
    
    // Handle other errors (4xx/5xx for real failures)
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
