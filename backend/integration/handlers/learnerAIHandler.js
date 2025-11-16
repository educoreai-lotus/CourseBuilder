/**
 * Learner AI Integration Handler
 * Handles incoming data from Learner AI microservice
 * Note: Learner AI sends skill path + metadata, not content
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';

/**
 * Handle Learner AI integration request
 * @param {Object} payloadObject - Parsed payload from Learner AI
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleLearnerAIIntegration(payloadObject, responseTemplate) {
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

    // Fill response template with contract-matching fields
    responseTemplate.user_id = data.user_id;
    responseTemplate.user_name = data.user_name || '';
    responseTemplate.company_id = data.company_id || null;
    responseTemplate.company_name = data.company_name || null;
    responseTemplate.skills = data.skills || [];
    responseTemplate.competency_name = data.competency_name || null;
    
    // Return the filled response template
    return responseTemplate;
  } catch (error) {
    console.error('[LearnerAI Handler] Error:', error);
    throw error;
  }
}

export default {
  handleLearnerAIIntegration
};

