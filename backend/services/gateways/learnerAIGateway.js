/**
 * Learner AI Gateway
 * Routes requests to Learner AI through Coordinator with signatures
 * NEW FLOW: Course Builder calls Learner AI with learner_id and tag
 */

import { postToCoordinator } from './coordinatorClient.js';

/**
 * Send request to Learner AI via Coordinator
 * @param {Object} payloadObject - Payload object with learner_id and tag
 * @param {string} payloadObject.user_id - Learner ID (required)
 * @param {string} payloadObject.tag - Tag (competency, learning-path-name, etc) (required)
 * @returns {Promise<Object>} Response payload object with learning_path and skills
 */
export async function sendToLearnerAI(payloadObject = {}) {
  try {
    // Build payload object for NEW flow
    // Directory → Course Builder → Learner AI
    // Course Builder sends: { learner_id, tag }
    const sendPayload = {
      action: 'get_learning_path',
      description: 'Get personalized learning path and skills for a learner based on competency tag',
      user_id: payloadObject.user_id || payloadObject.learner_id || null,
      tag: payloadObject.tag || null
    };

    // Validate required fields
    if (!sendPayload.user_id || !sendPayload.tag) {
      throw new Error('user_id (or learner_id) and tag are required for Learner AI request');
    }

    // Build response template (empty, Learner AI will fill it)
    // NEW: Learner AI returns wrapped JSON with career_learning_paths[]
    const responseTemplate = {
      user_id: null,
      user_name: '',
      company_id: null,
      company_name: '',
      learning_flow: '',
      career_learning_paths: [
        {
          competency_target_name: '',
          skills_raw_data: {}, // Course Builder IGNORES this - only Content Studio uses it,;;;;;
          learning_path: {
            learner_id: null,
            path_title: '',
            learning_modules: [],
            total_estimated_duration_hours: 0
          }
        }
      ]
    };

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course-builder',
      payload: sendPayload,
      response: responseTemplate
    };

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // Coordinator returns the envelope with filled response field
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return response data (should contain structured Learning Path JSON)
    return result;
  } catch (error) {
    console.error('[LearnerAI Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToLearnerAI
};
