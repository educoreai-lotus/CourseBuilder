/**
 * DevLab Gateway
 * Routes requests to DevLab through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import devlabDTO from '../../dtoBuilders/devlabDTO.js';

/**
 * Send request to DevLab via Coordinator
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @param {string} learnerName - Learner name (optional)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToDevlab(course, learnerId, learnerName = null) {
  try {
    // Build payload using DTO
    const sendPayload = devlabDTO.buildSendPayload(course, learnerId, learnerName);
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'notify_learner_course_completion';
    sendPayload.description = 'Notify that a learner has successfully completed a course and passed the final assessment, enabling access to development environment for hands-on coding practice and project work';

    // Build envelope for Coordinator (empty response - fire-and-forget)
    const envelope = {
      requester_service: 'course-builder-service',
      payload: sendPayload,
      response: {
        answer: ''
      }
    };

    console.log('[DevLab Gateway] Sending request to Coordinator:', {
      action: sendPayload.action,
      course_id: sendPayload.course_id,
      learner_id: sendPayload.learner_id,
      learner_name: sendPayload.learner_name,
      course_name: sendPayload.course_name
    });

    // Send via Coordinator - Coordinator will route to DevLab service based on action field
    // Fire-and-forget: don't wait for response
    postToCoordinator(envelope).catch((error) => {
      console.error('[DevLab Gateway] Coordinator request failed:', error.message);
    });

    // Return immediately (don't wait for DevLab response)
    return {};
  } catch (error) {
    console.error('[DevLab Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToDevlab
};

