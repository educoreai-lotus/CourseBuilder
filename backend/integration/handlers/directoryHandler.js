/**
 * Directory Integration Handler
 * Handles incoming data from Directory microservice
 */

import directoryDTO from '../../dtoBuilders/directoryDTO.js';

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
    throw error;
  }
}

export default {
  handleDirectoryIntegration
};

