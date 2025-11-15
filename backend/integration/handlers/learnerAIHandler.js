/**
 * Learner AI Integration Handler
 * Handles incoming data from Learner AI microservice
 * Note: Learner AI sends skill path + metadata, not content
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';

/**
 * Handle Learner AI integration request
 * @param {Object} payloadObject - Parsed payload from Learner AI
 * @returns {Promise<Object>} Response payload
 */
export async function handleLearnerAIIntegration(payloadObject) {
  try {
    // Normalize Learner AI payload
    const data = learnerAIDTO.buildFromReceived(payloadObject);

    // Learner AI sends skill path + metadata
    // Course Builder extracts metadata and sends to Content Studio
    // Content Studio generates the actual lessons
    
    console.log('[LearnerAI Handler] Received:', {
      user_id: data.user_id,
      skills: data.skills,
      competency_name: data.competency_name
    });

    // Return response in unified format
    // This triggers course creation flow which will request lessons from Content Studio
    return {
      serviceName: 'LearnerAI',
      status: 'received',
      user_id: data.user_id,
      skills_count: data.skills?.length || 0,
      competency_name: data.competency_name,
      message: 'Learner AI data received. Course creation will be triggered.'
    };
  } catch (error) {
    console.error('[LearnerAI Handler] Error:', error);
    throw error;
  }
}

export default {
  handleLearnerAIIntegration
};

