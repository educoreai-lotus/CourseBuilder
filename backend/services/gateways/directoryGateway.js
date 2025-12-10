/**
 * Directory Gateway
 * Routes requests to Directory through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import directoryDTO from '../../dtoBuilders/directoryDTO.js';

/**
 * Send feedback to Directory microservice via Coordinator
 * @param {Object} feedback - Feedback entity
 * @param {Object} course - Course entity (to lookup course_name)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToDirectory(feedback, course) {
  try {
    // Build payload using DTO (looks up course_name from course entity)
    const sendPayload = directoryDTO.buildSendPayload(feedback, course);
    
    // Add action field for Coordinator routing
    sendPayload.action = 'submit_feedback';

    // Build response template (empty, Directory doesn't return data for feedback)
    const responseTemplate = {};

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course_builder',
      payload: sendPayload,
      response: responseTemplate
    };

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // Coordinator returns the envelope with filled response field
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return response data (usually empty for Directory feedback)
    return result;
  } catch (error) {
    console.error('[Directory Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToDirectory
};
