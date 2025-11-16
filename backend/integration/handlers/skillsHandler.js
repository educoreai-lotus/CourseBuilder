/**
 * Skills Engine Integration Handler
 * Handles incoming skills data from Skills Engine microservice
 */

import skillsEngineDTO from '../../dtoBuilders/skillsEngineDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

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
    
    // Check if we should use fallback data (network/service errors)
    if (shouldUseFallback(error, 'SkillsEngine')) {
      console.warn('[SkillsEngine Handler] Using fallback data due to service unavailability');
      const fallback = getFallbackData('SkillsEngine');
      
      responseTemplate.skills = fallback.skills || payloadObject.skills || [];
      
      return responseTemplate;
    }
    
    // For non-network errors, use payload data
    try {
      responseTemplate.skills = payloadObject.skills || [];
      
      return responseTemplate;
    } catch (fallbackError) {
      // Last resort: use mock fallback data
      const fallback = getFallbackData('SkillsEngine');
      return {
        skills: fallback.skills || []
      };
    }
  }
}

export default {
  handleSkillsIntegration
};

