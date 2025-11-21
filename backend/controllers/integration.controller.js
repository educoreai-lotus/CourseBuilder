/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 * Implements shared envelope structure with regular JSON objects (not stringified).
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';

/**
 * Infer target service from payload structure
 * Routing logic is internal - determines which microservice to route to based on payload content
 * 
 * NOTE: If no pattern matches and we have a response template, default to CourseBuilder
 * (AI-powered query generation for Course Builder's own database)
 */
function inferTargetServiceFromPayload(payloadObject, responseTemplate) {
  if (!payloadObject || typeof payloadObject !== 'object') {
    // If we have a response template, default to CourseBuilder for AI-powered filling
    return responseTemplate ? 'CourseBuilder' : null;
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
  
  // Default: If we have a response template, use CourseBuilder with AI-powered query generation
  // This handles cases where the payload doesn't match any known pattern but we still need to fill the template
  if (responseTemplate && typeof responseTemplate === 'object') {
    return 'CourseBuilder';
  }
  
  return null;
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
    // Only three fields allowed: requester_service, payload, response
    const requesterService = envelope.requester_service;
    const hasRequesterService = typeof requesterService === 'string' && requesterService.trim().length > 0;
    const hasPayload = envelope.payload && typeof envelope.payload === 'object';
    const hasResponse = envelope.response && typeof envelope.response === 'object';

    if (!hasRequesterService || !hasPayload || !hasResponse) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Envelope must include "requester_service" (string, lowercase with underscores), "payload" (JSON object), and "response" (JSON object)'
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json(errorPayload);
    }

    // Payload and response are already objects (NOT stringified)
    const payloadObject = envelope.payload;
    const responseObject = envelope.response;

    // Infer target service from payload structure (routing is internal)
    // Pass responseTemplate to allow defaulting to CourseBuilder if no pattern matches
    const targetService = inferTargetServiceFromPayload(payloadObject, responseObject);
    if (!targetService) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Could not determine target service from payload structure. Please ensure payload matches a known service pattern or provide a valid response template.'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Call dispatcher with target service, payload, and response template
    const filledResponse = await dispatchIntegrationRequest(targetService, payloadObject, responseObject);

    // Handler returns the filled response object
    // Response is already a regular object (NOT stringified)
    
    // Return only the three required fields: requester_service, payload, response
    // Routing information (target_service) is internal and not exposed
    const responseEnvelope = {
      requester_service: envelope.requester_service, // Keep original requester_service
      payload: payloadObject, // Keep original payload
      response: filledResponse // Return filled response object
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
