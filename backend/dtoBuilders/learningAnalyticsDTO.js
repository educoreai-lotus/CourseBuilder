/**
 * Learning Analytics DTO Builder
 * Builds payloads for sending to Learning Analytics microservice
 * Note: Learning Analytics only receives data, does not send back
 */

/**
 * Build complete analytics payload to SEND to Learning Analytics
 * @param {Object} course - Course entity
 * @param {Object} analyticsData - Additional analytics data
 * @returns {Object} Learning Analytics send payload
 */
export function buildSendPayload(course, analyticsData = {}) {
  if (!course || !course.id) {
    throw new Error('Course is required with id property');
  }

  const basePayload = {
    course_id: course.id,
    course_name: course.course_name,
    course_type: course.course_type,
    status: course.status,
    level: course.level,
    duration_hours: course.duration_hours,
    created_at: course.created_at?.toISOString(),
    updated_at: course.updated_at?.toISOString()
  };

  // Merge additional analytics data (progress, feedback, skill coverage, etc.)
  return {
    ...basePayload,
    ...analyticsData,
    // Ensure timestamps are strings
    ...(analyticsData.created_at && typeof analyticsData.created_at !== 'string' 
      ? { created_at: analyticsData.created_at.toISOString() } 
      : {}),
    ...(analyticsData.updated_at && typeof analyticsData.updated_at !== 'string'
      ? { updated_at: analyticsData.updated_at.toISOString() }
      : {})
  };
}

/**
 * Build analytics payload from course structure and progress
 * ⚠️ CRITICAL: Skills are ONLY stored at Lesson level - aggregate from lessons, not topics
 * Topics and Modules are structural containers only - they do NOT store skills
 * @param {Object} course - Course entity
 * @param {Array} topics - Topics array (structural only)
 * @param {Array} lessons - Lessons array (contains real content and skills)
 * @param {Array} registrations - Registrations array
 * @param {Array} feedback - Feedback array
 * @param {Array} assessments - Assessments array
 * @returns {Object} Complete analytics payload
 */
export function buildFromCourseData(course, topics = [], lessons = [], registrations = [], feedback = [], assessments = []) {
  const basePayload = buildSendPayload(course);

  // Aggregate skills from lessons ONLY (not from topics - topics are structural only)
  const allSkills = lessons.flatMap(lesson => Array.isArray(lesson.skills) ? lesson.skills : []);

  return {
    ...basePayload,
    structure: {
      topics_count: topics.length,
      topics: topics.map(topic => ({
        topic_id: topic.id,
        topic_name: topic.topic_name
        // Topics are structural containers only - they do NOT have a skills field
        // Skills are aggregated from lessons dynamically, not stored on topics
      })),
      lessons_count: lessons.length,
      // Skills are ONLY stored at Lesson level
      skills: [...new Set(allSkills)] // Unique skills aggregated from lessons
    },
    enrollment: {
      total_enrollments: registrations.length,
      active_enrollments: registrations.filter(r => r.status === 'in_progress').length,
      completed_enrollments: registrations.filter(r => r.status === 'completed').length
    },
    feedback: {
      total_feedback: feedback.length,
      average_rating: feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0,
      feedbacks: feedback.map(f => ({
        learner_id: f.learner_id,
        rating: f.rating,
        comment: f.comment,
        submitted_at: f.submitted_at?.toISOString()
      }))
    },
    assessments: {
      total_assessments: assessments.length,
      passed_count: assessments.filter(a => a.passed === true).length,
      average_grade: assessments.length > 0
        ? assessments.reduce((sum, a) => sum + (a.final_grade || 0), 0) / assessments.length
        : 0
    }
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
    typeof payload.course_name === 'string'
  );
}

export default {
  buildSendPayload,
  buildFromCourseData,
  validateSendPayload
};


