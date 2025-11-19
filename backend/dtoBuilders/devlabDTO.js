/**
 * DevLab DTO Builder
 * Builds payloads for sending to DevLab microservice
 */

/**
 * Build payload to SEND to DevLab
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @returns {Object} DevLab send payload
 */
export function buildSendPayload(course, learnerId) {
  if (!course || !course.id) {
    throw new Error('Course is required with id property');
  }

  if (!learnerId) {
    throw new Error('Learner ID is required');
  }

  return {
    course_id: course.id,
    learner_id: learnerId,
    course_name: course.course_name
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
    typeof payload.course_id === 'string' &&
    typeof payload.learner_id === 'string' &&
    typeof payload.course_name === 'string'
  );
}

export default {
  buildSendPayload,
  validateSendPayload
};







