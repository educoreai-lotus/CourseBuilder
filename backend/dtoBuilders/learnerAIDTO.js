/**
 * Learner AI DTO Builder
 * Builds payloads for receiving from Learner AI microservice
 * Note: Learner AI only sends data to Course Builder, does not receive
 */

/**
 * Build payload from RECEIVED Learner AI data
 * @param {Object} data - Raw data from Learner AI microservice
 * @returns {Object} Normalized Learner AI data (backward compatible)
 */
export function buildFromReceived(data) {
  // Handle both old and new formats for backward compatibility
  // Map new format fields to existing structure for Course Builder internal logic
  const normalized = {
    user_id: data.user_id,
    user_name: data.user_name || data.learner_name, // Support both
    company_id: data.company_id,
    company_name: data.company_name,
    // Handle skills: old format uses 'skills', new format uses 'skills_raw_data'
    skills: Array.isArray(data.skills_raw_data) 
      ? data.skills_raw_data 
      : (Array.isArray(data.skills) ? data.skills : []),
    // Handle competency: old format uses 'competency_name', new format uses 'competency_target_name'
    competency_name: data.competency_target_name || data.competency_name,
    // NEW: Extract learning_path if present (must remain untouched)
    learning_path: data.learning_path || null,
    // Extract preferred_language to pass to Content Studio (not used in logic, but forwarded)
    preferred_language: data.preferred_language || null
  };
  
  return normalized;
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










