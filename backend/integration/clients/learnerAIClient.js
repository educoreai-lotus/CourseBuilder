/**
 * Learner AI Outbound Client
 * Sends requests to Learner AI microservice via unified endpoint
 */

import axios from 'axios';

/**
 * Get Learner AI API URL from environment
 * @returns {string} Learner AI API URL
 */
function getApiUrl() {
  const url = process.env.LEARNER_AI_API_URL || process.env.LEARNER_AI_URL;
  if (!url) {
    throw new Error('LEARNER_AI_API_URL or LEARNER_AI_URL must be set in environment variables');
  }
  return `${url}/api/fill-learner-ai-fields`;
}

/**
 * Send request to Learner AI
 * @param {Object} payloadObject - Payload object (empty skeleton or minimal data)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToLearnerAI(payloadObject = {}) {
  try {
    // Build payload object (empty skeleton or minimal data)
    // When Course Builder requests data, send empty JSON payload skeleton
    const sendPayload = {
      user_id: payloadObject.user_id || null,
      skills: payloadObject.skills || [],
      competency_name: payloadObject.competency_name || null
    };

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'LearnerAI',
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
    console.error('[LearnerAI Client] Error:', error);
    throw error;
  }
}

export default {
  sendToLearnerAI
};

