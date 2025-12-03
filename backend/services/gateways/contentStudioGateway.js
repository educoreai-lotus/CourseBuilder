/**
 * Content Studio Gateway
 * Routes requests to Content Studio through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';

/**
 * Send request to Content Studio via Coordinator
 * @param {Object} payloadObject - Payload object (will be converted to envelope)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToContentStudio(payloadObject) {
  try {
    // Build payload using DTO
    const sendPayload = contentStudioDTO.buildSendPayload(
      payloadObject.learnerData || {},
      payloadObject.skills || []
    );

    // Add additional context if provided
    if (payloadObject.courseId) {
      sendPayload.courseId = payloadObject.courseId;
    }
    if (payloadObject.moduleId) {
      sendPayload.moduleId = payloadObject.moduleId;
    }
    if (payloadObject.topic) {
      sendPayload.topic = payloadObject.topic;
    }

    // Build response template (empty, Content Studio will fill it)
    const responseTemplate = {
      course: []
    };

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course_builder',
      payload: sendPayload,
      response: responseTemplate
    };

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // Coordinator returns the envelope with filled response field
    // Extract response from envelope structure
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return the filled response object (Content Studio fills the 'course' array)
    return result;
  } catch (error) {
    console.error('[ContentStudio Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToContentStudio
};
