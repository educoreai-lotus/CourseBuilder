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

    // Build response template (empty, Content Studio will fill it)
    const responseTemplate = {
      course: []
    };

    // Send using unified endpoint format (three-field structure)
    // Use lowercase with underscores for requester_service
    const requestBody = {
      requester_service: 'course-builder-service',
      payload: sendPayload, // Regular object, NOT stringified
      response: responseTemplate // Regular object, NOT stringified
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Response is a regular JSON object (NOT stringified)
    const responseData = response.data;

    // Return the filled response object
    return responseData.response || responseData;
  } catch (error) {
    console.error('[ContentStudio Client] Error:', error);
    throw error;
  }
}

export default {
  sendToContentStudio
};

