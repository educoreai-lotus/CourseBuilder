/**
 * Learner AI Gateway
 * Routes requests to Learner AI through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';

/**
 * Send request to Learner AI via Coordinator
 * @param {Object} payloadObject - Payload object (empty skeleton or minimal data)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToLearnerAI(payloadObject = {}) {
  try {
    // Build payload object
    const sendPayload = {
      user_id: payloadObject.user_id || null,
      skills: payloadObject.skills || [],
      competency_name: payloadObject.competency_name || null
    };

    // Build response template (empty, Learner AI will fill it)
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

    // Return response data
    return result;
  } catch (error) {
    console.error('[LearnerAI Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToLearnerAI
};
