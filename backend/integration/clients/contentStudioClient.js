/**
 * Content Studio Outbound Client
 * Sends requests to Content Studio microservice via unified endpoint
 */

import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';
import axios from 'axios';

/**
 * Get Content Studio API URL from environment
 * @returns {string} Content Studio API URL
 */
function getApiUrl() {
  const url = process.env.CONTENT_STUDIO_API_URL || process.env.CONTENT_STUDIO_URL;
  if (!url) {
    throw new Error('CONTENT_STUDIO_API_URL or CONTENT_STUDIO_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send request to Content Studio
 * @param {Object} payloadObject - Payload object (will be converted to string)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToContentStudio(payloadObject) {
  try {
    // Build payload using DTO
    // Content Studio typically receives learner data + skills to generate lessons
    const sendPayload = contentStudioDTO.buildSendPayload(
      payloadObject.learnerData || {},
      payloadObject.skills || []
    );

    // Add additional context if provided (courseId, moduleId, topic)
    if (payloadObject.courseId) {
      sendPayload.courseId = payloadObject.courseId;
    }
    if (payloadObject.moduleId) {
      sendPayload.moduleId = payloadObject.moduleId;
    }
    if (payloadObject.topic) {
      sendPayload.topic = payloadObject.topic;
    }

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'ContentStudio',
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
    console.error('[ContentStudio Client] Error:', error);
    throw error;
  }
}

export default {
  sendToContentStudio
};

