/**
 * Skills Engine Integration Handler
 * Handles incoming skills data from Skills Engine microservice
 */

import skillsEngineDTO from '../../dtoBuilders/skillsEngineDTO.js';

/**
 * Handle Skills Engine integration request
 * @param {Object} payloadObject - Parsed payload from Skills Engine
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleSkillsIntegration(payloadObject, responseTemplate) {
  try {
    // Normalize Skills Engine payload
    const data = skillsEngineDTO.buildFromReceived(payloadObject);

    console.log('[SkillsEngine Handler] Received:', {
      skills: data.skills,
      skills_count: data.skills?.length || 0
    });

    // Skills can be associated with lessons when updating course structure
    // This is typically used when updating course structure
    
    // Fill response template with contract-matching fields
    responseTemplate.skills = data.skills || [];
    
    // Return the filled response template
    return responseTemplate;
  } catch (error) {
    console.error('[SkillsEngine Handler] Error:', error);
    throw error;
  }
}

export default {
  handleSkillsIntegration
};

