/**
 * Skills Engine DTO Builder
 * Builds payloads for sending to and receiving from Skills Engine microservice
 */

/**
 * Build payload to SEND to Skills Engine
 * @param {Object} topic - Topic entity
 * @returns {Object} Skills Engine send payload
 */
export function buildSendPayload(topic) {
  if (!topic) {
    throw new Error('Topic is required');
  }

  return {
    topic: topic.topic_name || topic.competency || null
  };
}

/**
 * Build payload from RECEIVED skills data
 * @param {Object} data - Raw data from Skills Engine
 * @returns {Object} Normalized skills data
 */
export function buildFromReceived(data) {
  return {
    skills: Array.isArray(data.skills) ? data.skills : []
  };
}

/**
 * Validate send payload
 * @param {Object} payload - Payload to validate
 * @returns {boolean} True if valid
 */
export function validateSendPayload(payload) {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.topic === 'string'
  );
}

export default {
  buildSendPayload,
  buildFromReceived,
  validateSendPayload
};







