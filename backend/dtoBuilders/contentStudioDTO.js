/**
 * Content Studio DTO Builder
 * Builds payloads for sending to and receiving from Content Studio microservice
 */

/**
 * Build payload to SEND to Content Studio
 * @param {Object} learnerData - Learner information
 * @param {Array} skills - Skills array
 * @returns {Object} Content Studio send payload
 */
export function buildSendPayload(learnerData = {}, skills = []) {
  return {
    learner_id: learnerData.learner_id || null,
    learner_company: learnerData.learner_company || null,
    skills: Array.isArray(skills) ? skills : []
  };
}

/**
 * Build payload from RECEIVED trainer course data
 * ⚠️ CRITICAL: Content Studio "topic" maps to Course Builder "lesson"
 * Content Studio sends topics[] array, each topic becomes a lesson
 * Content Studio contents[] array → lesson.content_data (entire array as JSONB)
 * @param {Object} data - Raw data from Content Studio
 * @returns {Object} Normalized trainer course data for lesson creation
 */
export function buildFromTrainerCourse(data) {
  // Content Studio topic = Course Builder lesson
  // Content Studio contents[] = lesson.content_data (entire array)
  return {
    course_id: data.course_id,
    course_name: data.course_name,
    course_description: data.course_description,
    course_language: data.course_language,
    trainer_id: data.trainer_id,
    trainer_name: data.trainer_name,
    // Content Studio topic fields → Course Builder lesson fields
    lesson_name: data.topic_name || data.topic?.topic_name || '',
    lesson_description: data.topic_description || data.topic?.topic_description || null,
    // Skills from Content Studio topic
    skills: Array.isArray(data.skills) ? data.skills : (data.topic?.skills ? (Array.isArray(data.topic.skills) ? data.topic.skills : [data.topic.skills]) : []),
    // Content Studio contents[] array → lesson.content_data (entire array)
    content_data: Array.isArray(data.contents) ? data.contents : (Array.isArray(data.content_data) ? data.content_data : []),
    // DevLab exercises - normalize empty string "" to []
    devlab_exercises: Array.isArray(data.devlab_exercises) 
      ? data.devlab_exercises 
      : (data.devlab_exercises === "" || !data.devlab_exercises) 
        ? [] 
        : [data.devlab_exercises],
    // Trainer IDs from Content Studio
    trainer_ids: data.trainer_id ? [data.trainer_id] : [],
    content_type: data.content_type || null,
    format_order: data.format_order || []
  };
}

/**
 * Build payload from RECEIVED learner-specific course data
 * ⚠️ CRITICAL: Content Studio "topic" maps to Course Builder "lesson"
 * Content Studio sends topics[] array, each topic becomes a lesson
 * Content Studio contents[] array → lesson.content_data (entire array as JSONB)
 * @param {Object} data - Raw data from Content Studio
 * @returns {Object} Normalized learner-specific course data for lesson creation
 */
export function buildFromLearnerCourse(data) {
  // Content Studio topic = Course Builder lesson
  // Content Studio contents[] = lesson.content_data (entire array)
  return {
    learner_id: data.learner_id,
    learner_name: data.learner_name,
    learner_company: data.learner_company,
    // Content Studio topic fields → Course Builder lesson fields
    lesson_name: data.topic_name || data.topic?.topic_name || '',
    lesson_description: data.topic_description || data.topic?.topic_description || null,
    topic_language: data.topic_language || data.topic?.topic_language || null,
    trainer_id: data.trainer_id,
    trainer_name: data.trainer_name,
    // Skills from Content Studio topic
    skills: Array.isArray(data.skills) ? data.skills : (data.topic?.skills ? (Array.isArray(data.topic.skills) ? data.topic.skills : [data.topic.skills]) : []),
    // Content Studio contents[] array → lesson.content_data (entire array)
    content_data: Array.isArray(data.contents) ? data.contents : (Array.isArray(data.content_data) ? data.content_data : []),
    // DevLab exercises - normalize empty string "" to []
    devlab_exercises: Array.isArray(data.devlab_exercises) 
      ? data.devlab_exercises 
      : (data.devlab_exercises === "" || !data.devlab_exercises) 
        ? [] 
        : [data.devlab_exercises],
    // Trainer IDs from Content Studio
    trainer_ids: data.trainer_id ? [data.trainer_id] : [],
    content_type: data.content_type || null,
    format_order: data.format_order || []
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
    Array.isArray(payload.skills)
  );
}

export default {
  buildSendPayload,
  buildFromTrainerCourse,
  buildFromLearnerCourse,
  validateSendPayload
};


