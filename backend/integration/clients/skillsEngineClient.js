/**
 * Skills Engine Outbound Client
 * Sends requests to Skills Engine microservice via unified endpoint
 */

import skillsEngineDTO from '../../dtoBuilders/skillsEngineDTO.js';
import axios from 'axios';

/**
 * Get Skills Engine API URL from environment
 * @returns {string} Skills Engine API URL
 */
function getApiUrl() {
  const url = process.env.SKILLS_ENGINE_API_URL || process.env.SKILLS_ENGINE_URL;
  if (!url) {
    throw new Error('SKILLS_ENGINE_API_URL or SKILLS_ENGINE_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send request to Skills Engine
 * @param {Object} topic - Topic entity
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToSkillsEngine(topic) {
  try {
    // Build payload using DTO
    const sendPayload = skillsEngineDTO.buildSendPayload(topic);

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'SkillsEngine',
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
    console.error('[SkillsEngine Client] Error:', error);
    throw error;
  }
}

export default {
  sendToSkillsEngine
};

