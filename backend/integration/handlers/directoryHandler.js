/**
 * Directory Integration Handler
 * Handles incoming data from Directory microservice
 */

import directoryDTO from '../../dtoBuilders/directoryDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

/**
 * Handle Directory integration request
 * @param {Object} payloadObject - Parsed payload from Directory
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleDirectoryIntegration(payloadObject, responseTemplate) {
  try {
    // Normalize Directory payload
    const data = directoryDTO.buildFromReceived(payloadObject);

    console.log('[Directory Handler] Received:', {
      employee_id: data.employee_id,
      preferred_language: data.preferred_language,
      bonus_attempt: data.bonus_attempt
    });

    // Directory data (employee_id, preferred_language, bonus_attempt)
    // Can be stored in a separate directory_data table or in course metadata
    // For now, we'll log it and return success
    
    // Fill response template with contract-matching fields
    responseTemplate.employee_id = data.employee_id;
    responseTemplate.preferred_language = data.preferred_language || null;
    responseTemplate.bonus_attempt = data.bonus_attempt || false;
    
    // Return the filled response template
    return responseTemplate;
  } catch (error) {
    console.error('[Directory Handler] Error:', error);
    
    // Check if we should use fallback data (network/service errors)
    if (shouldUseFallback(error, 'Directory')) {
      console.warn('[Directory Handler] Using fallback data due to service unavailability');
      const fallback = getFallbackData('Directory');
      
      responseTemplate.employee_id = fallback.employee_id || payloadObject.employee_id || '';
      responseTemplate.preferred_language = fallback.preferred_language || payloadObject.preferred_language || null;
      responseTemplate.bonus_attempt = fallback.bonus_attempt !== undefined ? fallback.bonus_attempt : (payloadObject.bonus_attempt || false);
      
      return responseTemplate;
    }
    
    // For non-network errors, use payload data
    try {
      responseTemplate.employee_id = payloadObject.employee_id || '';
      responseTemplate.preferred_language = payloadObject.preferred_language || null;
      responseTemplate.bonus_attempt = payloadObject.bonus_attempt || false;
      
      return responseTemplate;
    } catch (fallbackError) {
      // Last resort: use mock fallback data
      const fallback = getFallbackData('Directory');
      return {
        employee_id: fallback.employee_id || '',
        preferred_language: fallback.preferred_language || null,
        bonus_attempt: fallback.bonus_attempt || false
      };
    }
  }
}

export default {
  handleDirectoryIntegration
};

