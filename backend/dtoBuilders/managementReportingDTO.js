/**
 * Management Reporting DTO Builder
 * Builds payloads for sending to Management Reporting microservice
 */

/**
 * Build payload to SEND to Management Reporting
 * @param {Object} course - Course entity
 * @param {Object} stats - Course statistics
 * @returns {Object} Management Reporting send payload
 */
export function buildSendPayload(course, stats = {}) {
  if (!course || !course.id) {
    throw new Error('Course is required with id property');
  }

  return {
    course_id: course.id,
    course_name: course.course_name,
    level: course.level,
    duration: course.duration_hours,
    totalEnrollments: stats.totalEnrollments || 0,
    activeEnrollment: stats.activeEnrollment || 0,
    completionRate: stats.completionRate || 0,
    averageRating: stats.averageRating || 0,
    createdAt: course.created_at?.toISOString(),
    feedback: stats.feedback || []
  };
}

/**
 * Build payload from course and aggregated data
 * @param {Object} course - Course entity
 * @param {Array} registrations - Registrations array
 * @param {Array} feedback - Feedback array
 * @returns {Object} Management Reporting payload
 */
export function buildFromCourseStats(course, registrations = [], feedback = []) {
  const totalEnrollments = registrations.length;
  const activeEnrollment = registrations.filter(r => r.status === 'in_progress').length;
  const completedCount = registrations.filter(r => r.status === 'completed').length;
  const completionRate = totalEnrollments > 0 
    ? (completedCount / totalEnrollments) * 100 
    : 0;

  const averageRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : 0;

  return buildSendPayload(course, {
    totalEnrollments,
    activeEnrollment,
    completionRate,
    averageRating,
    feedback: feedback.map(f => ({
      learner_id: f.learner_id,
      rating: f.rating,
      comment: f.comment,
      submitted_at: f.submitted_at?.toISOString()
    }))
  });
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
    typeof payload.course_name === 'string' &&
    typeof payload.totalEnrollments === 'number' &&
    typeof payload.completionRate === 'number'
  );
}

export default {
  buildSendPayload,
  buildFromCourseStats,
  validateSendPayload
};


