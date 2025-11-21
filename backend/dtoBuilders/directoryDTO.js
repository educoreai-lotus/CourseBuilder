/**
 * Directory DTO Builder
 * Builds payloads for sending to and receiving from Directory microservice
 */

/**
 * Build payload to SEND to Directory
 * @param {Object} feedback - Feedback entity (from DB, no course_name)
 * @param {Object} course - Course entity (to lookup course_name)
 * @returns {Object} Directory send payload
 */
export function buildSendPayload(feedback, course) {
  if (!feedback) {
    throw new Error('Feedback is required');
  }
  if (!course || !course.id) {
    throw new Error('Course is required to lookup course_name');
  }

  return {
    feedback: {
      rating: feedback.rating,
      comment: feedback.comment || null,
      submitted_at: feedback.submitted_at?.toISOString() || new Date().toISOString()
    },
    course_id: course.id,
    course_name: course.course_name,
    employee_id: feedback.learner_id // Send learner_id value but use field name employee_id
  };
}

/**
 * Build payload from RECEIVED directory data
 * @param {Object} data - Raw data from Directory microservice
 * @returns {Object} Normalized directory data
 */
export function buildFromReceived(data) {
  return {
    employee_id: data.employee_id,
    preferred_language: data.preferred_language,
    bonus_attempt: data.bonus_attempt
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
    typeof payload.feedback === 'object' &&
    typeof payload.feedback.rating === 'number' &&
    typeof payload.course_id === 'string' &&
    typeof payload.employee_id === 'string' // Changed from learner_id to employee_id
  );
}

export default {
  buildSendPayload,
  buildFromReceived,
  validateSendPayload
};

