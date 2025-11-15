/**
 * Directory Integration Handler
 * Handles incoming data from Directory microservice
 */

import directoryDTO from '../../dtoBuilders/directoryDTO.js';

/**
 * Handle Directory integration request
 * @param {Object} payloadObject - Parsed payload from Directory
 * @returns {Promise<Object>} Response payload
 */
export async function handleDirectoryIntegration(payloadObject) {
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
    
    // Return response in unified format
    return {
      serviceName: 'Directory',
      status: 'received',
      employee_id: data.employee_id,
      preferred_language: data.preferred_language,
      bonus_attempt: data.bonus_attempt
    };
  } catch (error) {
    console.error('[Directory Handler] Error:', error);
    throw error;
  }
}

export default {
  handleDirectoryIntegration
};

