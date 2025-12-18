/**
 * Content Studio Data Normalizer
 * ⚠️ CRITICAL: Normalizes Content Studio data to match Course Builder schema
 * Content Studio "topic" → Course Builder "lesson"
 * Content Studio contents[] → lesson.content_data (entire array)
 */

/**
 * Normalize Content Studio lesson data
 * Ensures all arrays are arrays, normalizes empty strings to arrays
 * @param {Object} lessonData - Raw lesson data from Content Studio
 * @returns {Object} Normalized lesson data ready for database
 */
export function normalizeLessonData(lessonData) {
  if (!lessonData || typeof lessonData !== 'object') {
    throw new Error('Lesson data must be an object');
  }

  // Normalize content_data - must ALWAYS be an array
  let content_data = [];
  if (Array.isArray(lessonData.contents)) {
    // Content Studio contents[] array → lesson.content_data (entire array)
    content_data = lessonData.contents;
  } else if (Array.isArray(lessonData.content_data)) {
    content_data = lessonData.content_data;
  } else if (lessonData.content_data) {
    // If single object, wrap in array
    content_data = [lessonData.content_data];
  }

  // Normalize devlab_exercises - must ALWAYS be an array
  // Normalize empty string "" to []
  let devlab_exercises = [];
  if (Array.isArray(lessonData.devlab_exercises)) {
    devlab_exercises = lessonData.devlab_exercises;
  } else if (lessonData.devlab_exercises === "" || lessonData.devlab_exercises === null || lessonData.devlab_exercises === undefined) {
    devlab_exercises = [];
  } else if (lessonData.devlab_exercises) {
    // If single object, wrap in array
    devlab_exercises = [lessonData.devlab_exercises];
  }

  // Normalize skills - must ALWAYS be an array
  let skills = [];
  if (Array.isArray(lessonData.skills)) {
    skills = lessonData.skills;
  } else if (lessonData.skills) {
    skills = [lessonData.skills];
  }

  // Normalize trainer_ids - must ALWAYS be an array
  let trainer_ids = [];
  if (Array.isArray(lessonData.trainer_ids)) {
    trainer_ids = lessonData.trainer_ids;
  } else if (lessonData.trainer_id) {
    trainer_ids = [lessonData.trainer_id];
  }

  // Normalize format_order - must ALWAYS be an array (matches personalized flow)
  let format_order = [];
  if (Array.isArray(lessonData.format_order)) {
    format_order = lessonData.format_order;
  }

  // Derive content_type - MUST always exist
  let content_type = lessonData.content_type;
  if (!content_type && Array.isArray(content_data) && content_data.length > 0) {
    // If not provided at topic level, infer from first content block
    content_type = content_data[0]?.content_type || 'mixed';
  }
  if (!content_type) {
    content_type = 'mixed';
  }

  return {
    // Content Studio topic fields → Course Builder lesson fields
    lesson_name: lessonData.topic_name || lessonData.lesson_name || '',
    lesson_description: lessonData.topic_description || lessonData.lesson_description || null,
    content_type,
    content_data, // Normalized array
    devlab_exercises, // Normalized array
    skills, // Normalized array
    trainer_ids, // Normalized array
    format_order // Normalized array (even if empty)
  };
}

/**
 * Normalize Content Studio course payload
 * Maps Content Studio topics[] to Course Builder lessons
 * @param {Object} payload - Raw payload from Content Studio
 * @returns {Object} Normalized course data with lessons array
 */
export function normalizeContentStudioPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }

  const normalized = {
    course_id: payload.course_id,
    course_name: payload.course_name,
    course_description: payload.course_description,
    course_language: payload.course_language,
    trainer_id: payload.trainer_id,
    trainer_name: payload.trainer_name,
    learner_id: payload.learner_id, // Extract learner_id for course creation
    // Content Studio topics[] array → Course Builder lessons[] array
    // Each Content Studio topic becomes a Course Builder lesson
    lessons: []
  };

  // Process Content Studio topics[] array
  if (Array.isArray(payload.topics)) {
    normalized.lessons = payload.topics.map(topic => {
      // Each Content Studio topic = one Course Builder lesson
      return normalizeLessonData({
        ...topic,
        trainer_id: payload.trainer_id,
        trainer_name: payload.trainer_name,
        course_language: payload.course_language
      });
    });
  } else if (payload.topic) {
    // Single topic case
    normalized.lessons = [normalizeLessonData({
      ...payload.topic,
      trainer_id: payload.trainer_id,
      trainer_name: payload.trainer_name,
      course_language: payload.course_language
    })];
  }

  return normalized;
}

/**
 * Validate normalized lesson data
 * @param {Object} lessonData - Normalized lesson data
 * @returns {boolean} True if valid
 */
export function validateNormalizedLesson(lessonData) {
  if (!lessonData || typeof lessonData !== 'object') {
    return false;
  }

  // Required fields
  if (!lessonData.lesson_name) {
    return false;
  }

  // Must be arrays
  if (!Array.isArray(lessonData.content_data)) {
    return false;
  }
  if (!Array.isArray(lessonData.devlab_exercises)) {
    return false;
  }
  if (!Array.isArray(lessonData.skills)) {
    return false;
  }
  if (!Array.isArray(lessonData.trainer_ids)) {
    return false;
  }

  return true;
}

export default {
  normalizeLessonData,
  normalizeContentStudioPayload,
  validateNormalizedLesson
};

