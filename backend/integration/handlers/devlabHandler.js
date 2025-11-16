/**
 * DevLab Integration Handler
 * Handles incoming data from DevLab microservice
 */

/**
 * Handle DevLab integration request
 * @param {Object} payloadObject - Parsed payload from DevLab
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleDevlabIntegration(payloadObject, responseTemplate) {
  try {
    console.log('[DevLab Handler] Received:', payloadObject);

    // DevLab sends exercise completion data
    // Handle it here if needed
    
    // DevLab doesn't send data back - exercises stored in lessons.devlab_exercises
    // Return empty response template
    return responseTemplate;
  } catch (error) {
    console.error('[DevLab Handler] Error:', error);
    
    // Fallback: Return empty response template (DevLab doesn't send data back)
    return responseTemplate;
  }
}

export default {
  handleDevlabIntegration
};

