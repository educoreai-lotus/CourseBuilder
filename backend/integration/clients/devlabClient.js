/**
 * DevLab Outbound Client
 * Sends requests to DevLab microservice via unified endpoint
 */

import devlabDTO from '../../dtoBuilders/devlabDTO.js';
import axios from 'axios';

/**
 * Get DevLab API URL from environment
 * @returns {string} DevLab API URL
 */
function getApiUrl() {
  const url = process.env.DEVLAB_API_URL || process.env.DEVLAB_URL;
  if (!url) {
    throw new Error('DEVLAB_API_URL or DEVLAB_URL must be set in environment variables');
  }
  return `${url}/api/data-request`;
}

/**
 * Send request to DevLab microservice
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToDevlab(course, learnerId) {
  try {
    // Build payload using DTO
    const sendPayload = devlabDTO.buildSendPayload(course, learnerId);

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'Devlab',
        payload: payloadString
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Parse response payload
    if (response.data && response.data.payload) {
      return JSON.parse(response.data.payload);
    }

    return response.data;
  } catch (error) {
    console.error('[DevLab Client] Error:', error);
    throw error;
  }
}

export default {
  sendToDevlab
};

