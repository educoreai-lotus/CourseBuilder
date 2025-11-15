/**
 * DevLab Integration Handler
 * Handles incoming data from DevLab microservice
 */

/**
 * Handle DevLab integration request
 * @param {Object} payloadObject - Parsed payload from DevLab
 * @returns {Promise<Object>} Response payload
 */
export async function handleDevlabIntegration(payloadObject) {
  try {
    console.log('[DevLab Handler] Received:', payloadObject);

    // DevLab sends exercise completion data
    // Handle it here if needed
    
    // Return response in unified format
    return {
      serviceName: 'DevLab',
      status: 'received',
      data: payloadObject
    };
  } catch (error) {
    console.error('[DevLab Handler] Error:', error);
    throw error;
  }
}

export default {
  handleDevlabIntegration
};

