/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 * Implements strict stringified JSON request/response contract.
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';

/**
 * Infer target service from payload structure
 * Routing logic is internal - determines which microservice to route to based on payload content
 */
function inferTargetServiceFromPayload(payloadObject) {
  if (!payloadObject || typeof payloadObject !== 'object') return null;
  
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
 * Unified integration endpoint handler
 * POST /api/fill-content-metrics
 *
 * Contract rules:
 * 1) Request body is a stringified JSON (Express JSON parser will yield a string)
 * 2) Parse with JSON.parse to object: must contain requester_service (string, always "CourseBuilder"), payload (stringified JSON string), response (stringified JSON string)
 * 3) Parse both payload and response strings to objects
 * 4) Infer target service from payload structure (routing is internal)
 * 5) Route to appropriate handler, pass parsed payload and response template
 * 6) Handler fills the response template and returns it
 * 7) Stringify response back and return the full envelope as stringified JSON (only requester_service, payload, response)
 * 8) On parse/validation error: respond 400 with stringified JSON error
 */
export async function handleFillContentMetrics(req, res) {
  try {
    // Body may arrive as:
    // 1. A string (stringified JSON) - if Express.json() middleware is not used or body is sent as text
    // 2. An object (already parsed by Express.json() middleware)
    let envelope;
    if (typeof req.body === 'string') {
      // Body is a string - parse it
      try {
        envelope = JSON.parse(req.body);
      } catch (parseError) {
        const errorPayload = {
          error: 'Bad Request',
          message: 'Failed to parse request body as JSON',
          details: parseError.message
        };
        res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      // Body is already parsed by Express.json() - use it directly
      envelope = req.body;
    } else {
      // Invalid body type
      const errorPayload = {
        error: 'Bad Request',
        message: 'Request body must be a valid JSON object or stringified JSON'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Validate required fields and structure
    // Only three fields allowed: requester_service, payload, response
    const requesterService = envelope.requester_service;
    const hasRequesterService = typeof requesterService === 'string' && requesterService.trim() === 'CourseBuilder';
    const hasPayload = envelope.payload && typeof envelope.payload === 'string';
    const hasResponse = envelope.response && typeof envelope.response === 'string';

    if (!hasRequesterService || !hasPayload || !hasResponse) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Envelope must include only "requester_service" (string, must be "CourseBuilder"), "payload" (stringified JSON string), and "response" (stringified JSON string)'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Ensure requester_service is set correctly
    envelope.requester_service = 'CourseBuilder';

    // Parse payload (it's a stringified JSON)
    let payloadObject;
    try {
      payloadObject = JSON.parse(envelope.payload);
    } catch (parseError) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Failed to parse payload as JSON',
        details: parseError.message
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Parse response (it's a stringified JSON)
    let responseObject;
    try {
      responseObject = JSON.parse(envelope.response);
    } catch (parseError) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Failed to parse response as JSON',
        details: parseError.message
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Infer target service from payload structure (routing is internal)
    const targetService = inferTargetServiceFromPayload(payloadObject);
    if (!targetService) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Could not determine target service from payload structure. Please ensure payload matches a known service pattern.'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Call dispatcher with target service, payload, and response template
    const filledResponse = await dispatchIntegrationRequest(targetService, payloadObject, responseObject);

    // Handler returns the filled response object
    // Stringify response back to string
    envelope.response = JSON.stringify(filledResponse);
    
    // Return only the three required fields: requester_service, payload, response
    // Routing information (target_service) is internal and not exposed
    const responseEnvelope = {
      requester_service: 'CourseBuilder',
      payload: envelope.payload,
      response: envelope.response
    };

    // Return the full envelope as stringified JSON
    // Set Content-Type to text/plain since we're sending stringified JSON
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(JSON.stringify(responseEnvelope));
  } catch (error) {
    console.error('[Integration Controller] Error processing request from CourseBuilder:', error);
    const status = error.status || 500;
    const errorPayload = {
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message: error.message || 'Unhandled error'
    };
    res.setHeader('Content-Type', 'text/plain');
    return res.status(status).send(JSON.stringify(errorPayload));
  }
}

export default {
  handleFillContentMetrics
};
