/**
 * Lesson Fetcher Service
 * Shared utility for fetching lessons for a course
 * Used by both assessment gateway and assessment handler
 */

import lessonRepository from '../repositories/LessonRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';

/**
 * Fetch all lessons for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of lesson entities
 */
export async function fetchLessonsForCourse(courseId) {
  if (!courseId) {
    throw new Error('Course ID is required');
  }

  // Fetch course structure: Topics → Modules → Lessons
  const topics = await topicRepository.findByCourseId(courseId);
  const modules = [];
  
  for (const topic of topics) {
    const topicModules = await moduleRepository.findByTopicId(topic.id);
    modules.push(...topicModules);
  }
  
  const lessons = [];
  for (const module of modules) {
    const moduleLessons = await lessonRepository.findByModuleId(module.id);
    lessons.push(...moduleLessons);
  }
  
  return lessons;
}

export default {
  fetchLessonsForCourse
};

