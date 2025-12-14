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
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToDevlab(course, learnerId) {
  try {
    // Build payload using DTO
    const sendPayload = devlabDTO.buildSendPayload(course, learnerId);
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'notify_learner_passed';
    sendPayload.description = 'Notify that a learner has completed a course and passed the exam';

    // Build envelope for Coordinator (empty response - fire-and-forget)
    const envelope = {
      requester_service: 'course-builder-service',
      payload: sendPayload,
      response: {}
    };

    console.log('[DevLab Gateway] Sending request to Coordinator:', {
      action: sendPayload.action,
      course_id: sendPayload.course_id,
      learner_id: sendPayload.learner_id,
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

