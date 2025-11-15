/**
 * Content Studio Integration Handler
 * Handles incoming data from Content Studio microservice
 */

import courseRepository from '../../repositories/CourseRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';
import { normalizeContentStudioPayload } from '../../services/contentStudioNormalizer.js';

/**
 * Handle Content Studio integration request
 * @param {Object} payloadObject - Parsed payload from Content Studio
 * @returns {Promise<Object>} Response payload
 */
export async function handleContentStudioIntegration(payloadObject) {
  try {
    // Normalize Content Studio payload (topics[] → lessons[])
    const normalized = normalizeContentStudioPayload(payloadObject);

    // Determine if trainer or learner course
    const isTrainerCourse = !!normalized.trainer_id;
    
    // Create or update course
    let course = await courseRepository.findById(normalized.course_id);
    if (!course && isTrainerCourse) {
      // Create new trainer course
      course = await courseRepository.create({
        id: normalized.course_id,
        course_name: normalized.course_name,
        course_description: normalized.course_description,
        course_type: 'trainer',
        status: 'draft',
        created_by_user_id: normalized.trainer_id
      });
    } else if (!course && !isTrainerCourse) {
      // Create learner-specific course
      course = await courseRepository.create({
        course_name: normalized.course_name || 'Personalized Course',
        course_description: normalized.course_description,
        course_type: 'learner_specific',
        status: 'draft',
        learning_path_designation: {
          is_designated: true
        }
      });
      normalized.course_id = course.id;
    }

    // Create Topic → Module structure (structural containers)
    // Use default: Topic 1 / Module 1
    let topic = (await topicRepository.findByCourseId(course.id))[0];
    if (!topic) {
      topic = await topicRepository.create({
        course_id: course.id,
        topic_name: normalized.course_name || 'Topic 1',
        topic_description: normalized.course_description || null,
        skills: [] // Topics are structural only - skills stored on lessons
      });
    }

    let module = (await moduleRepository.findByTopicId(topic.id))[0];
    if (!module) {
      module = await moduleRepository.create({
        topic_id: topic.id,
        module_name: 'Module 1',
        module_description: null
      });
    }

    // Create lessons from Content Studio topics[] array
    // Each Content Studio topic becomes a Course Builder lesson
    const createdLessons = [];
    for (const lessonData of normalized.lessons) {
      const lesson = await lessonRepository.create({
        module_id: module.id,
        topic_id: topic.id,
        lesson_name: lessonData.lesson_name,
        lesson_description: lessonData.lesson_description,
        skills: lessonData.skills,
        trainer_ids: lessonData.trainer_ids,
        content_type: lessonData.content_type,
        content_data: lessonData.content_data,
        devlab_exercises: lessonData.devlab_exercises
      });
      createdLessons.push(lesson);
    }

    // Return response in unified format
    return {
      serviceName: 'ContentStudio',
      status: 'success',
      course_id: course.id,
      topic_id: topic.id,
      module_id: module.id,
      lessons_created: createdLessons.length,
      lesson_ids: createdLessons.map(l => l.id)
    };
  } catch (error) {
    console.error('[ContentStudio Handler] Error:', error);
    throw error;
  }
}

export default {
  handleContentStudioIntegration
};

