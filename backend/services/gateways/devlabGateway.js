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
    sendPayload.action = 'request_devlab_exercises';
    sendPayload.description = 'Request DevLab exercises for a learner who has completed a course and passed the exam';

    // Build response template (empty, DevLab will fill it)
    const responseTemplate = {
      devlab_exercises: []
    };

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course_builder',
      payload: sendPayload,
      response: responseTemplate
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

