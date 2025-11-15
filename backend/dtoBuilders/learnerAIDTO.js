/**
 * Learner AI DTO Builder
 * Builds payloads for receiving from Learner AI microservice
 * Note: Learner AI only sends data to Course Builder, does not receive
 */

/**
 * Build payload from RECEIVED Learner AI data
 * @param {Object} data - Raw data from Learner AI microservice
 * @returns {Object} Normalized Learner AI data
 */
export function buildFromReceived(data) {
  return {
    user_id: data.user_id,
    user_name: data.user_name,
    company_id: data.company_id,
    company_name: data.company_name,
    skills: Array.isArray(data.skills) ? data.skills : [],
    competency_name: data.competency_name
  };
}

/**
 * Validate received payload
 * @param {Object} payload - Payload to validate
 * @returns {boolean} True if valid
 */
export function validateReceivedPayload(payload) {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.user_id === 'string' &&
    Array.isArray(payload.skills)
  );
}

export default {
  buildFromReceived,
  validateReceivedPayload
};


