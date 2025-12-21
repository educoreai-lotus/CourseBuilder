/**
 * Assessment Gateway
 * Routes requests to Assessment through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';

/**
 * Send assessment launch request to Assessment microservice via Coordinator
 * REQUEST TYPE: LAUNCH
 * This is the first request in the 3-request flow - only sends basic course/learner info
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @param {string} learnerName - Learner name
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToAssessment(course, learnerId, learnerName) {
  try {
    console.log('[Assessment Gateway] 🚀 LAUNCH: Starting assessment launch request', {
      course_id: course.id,
      course_name: course.course_name,
      learner_id: learnerId,
      learner_name: learnerName
    });

    // Build payload using DTO (NO coverage_map for launch request)
    const sendPayload = assessmentDTO.buildSendPayload(course, learnerId, learnerName, [], false);
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'create_assessment';
    sendPayload.description = 'Create a new assessment session for a learner to take a course exam';

    // Build response template - empty for launch (Assessment doesn't need to fill anything)
    const responseTemplate = {};

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course-builder-service',
      payload: sendPayload,
      response: responseTemplate
    };

    console.log('[Assessment Gateway] 🚀 LAUNCH: Sending request to Coordinator:', {
      request_type: 'LAUNCH',
      action: sendPayload.action,
      course_id: sendPayload.course_id,
      learner_id: sendPayload.learner_id,
      learner_name: sendPayload.learner_name,
      course_name: sendPayload.course_name
    });

    // Send via Coordinator - Coordinator will route to Assessment service based on action field
    const { data: json } = await postToCoordinator(envelope).catch((error) => {
      console.error('[Assessment Gateway] Coordinator request failed:', error.message);
      throw error;
    });
    
    console.log('[Assessment Gateway] Received response from Coordinator:', {
      has_redirect_url: !!json?.response?.redirect_url,
      has_assessment_session_id: !!json?.response?.assessment_session_id
    });
    
    // Coordinator returns the envelope with filled response field
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return response data
    return result;
  } catch (error) {
    console.error('[Assessment Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToAssessment
};
