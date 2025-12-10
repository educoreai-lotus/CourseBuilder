/**
 * Content Studio Gateway
 * Routes requests to Content Studio through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';

/**
 * Send request to Content Studio via Coordinator
 * @param {Object} payloadObject - Payload object (will be converted to envelope)
 * @param {Object} payloadObject.learnerData - Learner data (learner_id, learner_name, learner_company)
 * @param {Array} payloadObject.skills - Skills array
 * @param {Array} payloadObject.learning_path - Learning path array (NEW: from Learner AI)
 * @param {string} payloadObject.language - Language code (NEW: from Directory)
 * @param {Object} payloadObject.trainerData - Trainer data (optional: trainer_id, trainer_name)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToContentStudio(payloadObject) {
  try {
    // Build payload using DTO
    const sendPayload = contentStudioDTO.buildSendPayload(
      payloadObject.learnerData || {},
      payloadObject.skills || []
    );
    
    // Add action field for Coordinator routing
    sendPayload.action = 'generate_course_content';

    // Add NEW fields for Directory → Learner AI → Content Studio flow
    if (payloadObject.learning_path) {
      sendPayload.learning_path = payloadObject.learning_path;
    }
    if (payloadObject.language) {
      sendPayload.language = payloadObject.language;
    }
    if (payloadObject.trainerData) {
      sendPayload.trainer_id = payloadObject.trainerData.trainer_id;
      sendPayload.trainer_name = payloadObject.trainerData.trainer_name;
    }

    // Add additional context if provided (for marketplace courses)
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
