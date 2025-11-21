/**
 * Directory Integration Handler
 * Handles incoming data from Directory microservice
 */

import directoryDTO from '../../dtoBuilders/directoryDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

/**
 * Handle Directory integration request
 * @param {Object} payloadObject - Parsed payload from Course Builder (feedback data)
 * @param {Object} responseTemplate - Empty response template (should be empty {} for one-way)
 * @returns {Promise<Object>} Empty response object (one-way communication)
 */
export async function handleDirectoryIntegration(payloadObject, responseTemplate) {
  try {
    // Directory integration is one-way: Course Builder sends feedback data
    // Directory does not return data in response to feedback
    
    console.log('[Directory Handler] Received feedback data:', {
      course_id: payloadObject.course_id,
      course_name: payloadObject.course_name,
      employee_id: payloadObject.employee_id,
      feedback: payloadObject.feedback
    });

    // Directory data (employee_id, preferred_language, bonus_attempt) are separate data
    // that Directory may provide in other contexts, but NOT part of the feedback response flow
    
    // Return empty response (one-way communication)
    return {};
  } catch (error) {
    console.error('[Directory Handler] Error:', error);
    
    // Even on error, return empty response (one-way)
    return {};
  }
}

export default {
  handleDirectoryIntegration
};

