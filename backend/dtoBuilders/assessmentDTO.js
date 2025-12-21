/**
 * Assessment DTO Builder
 * Builds payloads for sending to and receiving from Assessment microservice
 * ⚠️ CRITICAL: coverage_map is NOT stored in DB - it's built dynamically from lessons
 */

/**
 * Build coverage_map dynamically from lessons
 * ⚠️ coverage_map is computed from lessons table - not stored
 * @param {Array} lessons - Lessons array from database
 * @returns {Array} Coverage map array [{ lesson_id, skills }]
 */
export function buildCoverageMapFromLessons(lessons = []) {
  if (!Array.isArray(lessons)) {
    return [];
  }

  return lessons
    .filter(lesson => lesson && lesson.id)
    .map(lesson => ({
      lesson_id: lesson.id,
      skills: Array.isArray(lesson.skills) ? lesson.skills : []
    }));
}

/**
 * Build payload to SEND to Assessment
 * ⚠️ coverage_map is built dynamically from lessons - NOT from stored field
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @param {string} learnerName - Learner name
 * @param {Array} lessons - Lessons array (to build coverage_map dynamically, optional for launch)
 * @param {boolean} includeCoverageMap - Whether to include coverage_map (default: false for launch)
 * @returns {Object} Assessment send payload
 */
export function buildSendPayload(course, learnerId, learnerName, lessons = [], includeCoverageMap = false) {
  if (!course || !course.id) {
    throw new Error('Course is required with id property');
  }

  const payload = {
    learner_id: learnerId,
    learner_name: learnerName,
    course_id: course.id,
    course_name: course.course_name
  };

  // Only include coverage_map if explicitly requested (for backward compatibility)
  if (includeCoverageMap) {
    const coverage_map = buildCoverageMapFromLessons(lessons);
    payload.coverage_map = coverage_map;
  }

  return payload;
}

/**
 * Build payload from RECEIVED assessment data
 * @param {Object} data - Raw data from Assessment microservice
 * @returns {Object} Normalized assessment data
 */
export function buildFromReceived(data) {
  return {
    learner_id: data.user_id || data.learner_id, // Support both user_id and learner_id
    course_id: data.course_id,
    course_name: data.course_name,
    exam_type: data.exam_type || 'postcourse',
    passing_grade: typeof data.passing_grade === 'number' ? data.passing_grade : 70.00,
    final_grade: data.final_grade,
    passed: typeof data.passed === 'boolean' ? data.passed : null
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
    typeof payload.learner_id === 'string' &&
    typeof payload.course_id === 'string' &&
    Array.isArray(payload.coverage_map)
  );
}

export default {
  buildSendPayload,
  buildFromReceived,
  buildCoverageMapFromLessons,
  validateSendPayload
};


