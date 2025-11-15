/**
 * Skills Engine Integration Handler
 * Handles incoming skills data from Skills Engine microservice
 */

import skillsEngineDTO from '../../dtoBuilders/skillsEngineDTO.js';

/**
 * Handle Skills Engine integration request
 * @param {Object} payloadObject - Parsed payload from Skills Engine
 * @returns {Promise<Object>} Response payload
 */
export async function handleSkillsIntegration(payloadObject) {
  try {
    // Normalize Skills Engine payload
    const data = skillsEngineDTO.buildFromReceived(payloadObject);

    console.log('[SkillsEngine Handler] Received:', {
      skills: data.skills,
      skills_count: data.skills?.length || 0
    });

    // Skills can be associated with lessons when updating course structure
    // This is typically used when updating course structure
    
    // Return response in unified format
    return {
      serviceName: 'SkillsEngine',
      status: 'received',
      skills_count: data.skills?.length || 0,
      skills: data.skills || []
    };
  } catch (error) {
    console.error('[SkillsEngine Handler] Error:', error);
    throw error;
  }
}

export default {
  handleSkillsIntegration
};

