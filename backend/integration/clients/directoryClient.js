/**
 * Directory Outbound Client
 * Sends requests to Directory microservice via unified endpoint
 */

import directoryDTO from '../../dtoBuilders/directoryDTO.js';
import axios from 'axios';

/**
 * Get Directory API URL from environment
 * @returns {string} Directory API URL
 */
function getApiUrl() {
  const url = process.env.DIRECTORY_API_URL || process.env.DIRECTORY_URL;
  if (!url) {
    throw new Error('DIRECTORY_API_URL or DIRECTORY_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send feedback to Directory microservice
 * @param {Object} feedback - Feedback entity
 * @param {Object} course - Course entity (to lookup course_name)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToDirectory(feedback, course) {
  try {
    // Build payload using DTO (looks up course_name from course entity)
    const sendPayload = directoryDTO.buildSendPayload(feedback, course);

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'Directory',
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
    console.error('[Directory Client] Error:', error);
    throw error;
  }
}

export default {
  sendToDirectory
};

