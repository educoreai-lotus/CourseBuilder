/**
 * Management Reporting Integration Handler
 * Handles incoming data from Management Reporting microservice
 */

/**
 * Handle Management Reporting integration request
 * @param {Object} payloadObject - Parsed payload from Management Reporting
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleManagementReportingIntegration(payloadObject, responseTemplate) {
  try {
    console.log('[ManagementReporting Handler] Received:', payloadObject);

    // Management Reporting typically only receives data from Course Builder
    // If it sends data back, handle it here
    
    // Management Reporting doesn't send data back - return empty response template
    return responseTemplate;
  } catch (error) {
    console.error('[ManagementReporting Handler] Error:', error);
    
    // Fallback: Return empty response template (Management Reporting doesn't send data back)
    return responseTemplate;
  }
}

export default {
  handleManagementReportingIntegration
};

