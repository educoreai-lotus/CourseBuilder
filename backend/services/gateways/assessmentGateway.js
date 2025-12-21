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
    console.log(`
========================================
🚀 SENT TO ASSESSMENT (LAUNCH REQUEST)
========================================
`);
    console.log('[Assessment Gateway] Request Type: LAUNCH');
    console.log('[Assessment Gateway] Course:', {
      course_id: course.id,
      course_name: course.course_name
    });
    console.log('[Assessment Gateway] Learner:', {
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

    console.log('[Assessment Gateway] Full Envelope Being Sent:');
    console.log(JSON.stringify(envelope, null, 2));
    console.log(`
[Assessment Gateway] Payload Details:
- action: ${sendPayload.action}
- description: ${sendPayload.description}
- learner_id: ${sendPayload.learner_id}
- learner_name: ${sendPayload.learner_name}
- course_id: ${sendPayload.course_id}
- course_name: ${sendPayload.course_name}
- coverage_map: NOT INCLUDED (removed for launch request)
`);

    // Send via Coordinator - Coordinator will route to Assessment service based on action field
    const { data: json } = await postToCoordinator(envelope).catch((error) => {
      console.error(`
========================================
❌ ERROR SENDING TO ASSESSMENT
========================================
[Assessment Gateway] Coordinator request failed: ${error.message}
`);
      throw error;
    });
    
    console.log(`
========================================
✅ RECEIVED FROM ASSESSMENT (LAUNCH RESPONSE)
========================================
`);
    console.log('[Assessment Gateway] Full Response from Coordinator:');
    console.log(JSON.stringify(json, null, 2));
    console.log(`
[Assessment Gateway] Response Details:
- has_redirect_url: ${!!json?.response?.redirect_url}
- redirect_url: ${json?.response?.redirect_url || 'N/A'}
- has_assessment_session_id: ${!!json?.response?.assessment_session_id}
- assessment_session_id: ${json?.response?.assessment_session_id || 'N/A'}
- expires_in: ${json?.response?.expires_in || 'N/A'}
`);
    console.log(`========================================
`);

    // Coordinator returns the envelope with filled response field
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return response data
    return result;
  } catch (error) {
    console.error(`
========================================
❌ ERROR IN ASSESSMENT GATEWAY
========================================
[Assessment Gateway] Error: ${error.message}
Stack: ${error.stack}
========================================
`);
    throw error;
  }
}

export default {
  sendToAssessment
};
