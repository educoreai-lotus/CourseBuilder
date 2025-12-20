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
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

/**
 * Handle Content Studio integration request
 * @param {Object} payloadObject - Parsed payload from Content Studio
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleContentStudioIntegration(payloadObject, responseTemplate) {
  try {
    // Normalize Content Studio payload (topics[] → lessons[])
    const normalized = normalizeContentStudioPayload(payloadObject);

    // Determine if trainer or learner course
    const isTrainerCourse = !!normalized.trainer_id;
    
    // IMPORTANT: Use ONLY course_id from payloadObject (which we pass from learnerAIHandler)
    // Do NOT use any course_id from Content Studio response or normalized payload - we already have our own
    // We created the course BEFORE calling Content Studio, so we must use that course_id
    const courseIdToUse = payloadObject.course_id;
    
    if (!courseIdToUse && !isTrainerCourse) {
      console.warn('[ContentStudio Handler] ⚠️ No course_id provided in payloadObject - this should not happen for learner courses');
    }
    
    if (normalized.course_id && normalized.course_id !== courseIdToUse) {
      console.log('[ContentStudio Handler] ⚠️ Ignoring course_id from Content Studio response:', normalized.course_id, '- using our own:', courseIdToUse);
    }
    
    // Create or update course
    let course = courseIdToUse ? await courseRepository.findById(courseIdToUse) : null;
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
      // Set created_by_user_id to learner_id if provided (for CAREER_PATH_DRIVEN enrollment)
      course = await courseRepository.create({
        course_name: normalized.course_name || 'Personalized Course',
        course_description: normalized.course_description,
        course_type: 'learner_specific',
        status: 'active', // Set to active for enrollment flow
        created_by_user_id: normalized.learner_id || null, // Set learner_id as creator
        learning_path_designation: {
          is_designated: true
        }
      });
      normalized.course_id = course.id;
    } else if (course && courseIdToUse) {
      // Course already exists (we created it before calling Content Studio)
      // Use the existing course - ignore any course_id from Content Studio response
      console.log('[ContentStudio Handler] Using existing course:', course.id);
      console.log('[ContentStudio Handler] ⚠️ Ignoring any course_id from Content Studio response');
    }

    // Get existing topics and modules if course was already created
    const existingTopics = await topicRepository.findByCourseId(course.id);
    const existingModules = [];
    
    // Get modules for each existing topic
    for (const existingTopic of existingTopics) {
      const topicModules = await moduleRepository.findByTopicId(existingTopic.id);
      existingModules.push(...topicModules.map(m => ({ ...m, topic_id: existingTopic.id })));
    }
    
    console.log('[ContentStudio Handler] Existing structure:', {
      course_id: course.id,
      topics_count: existingTopics.length,
      modules_count: existingModules.length
    });
    
    // If course structure already exists, use it; otherwise create default structure
    let topic, module;
    if (existingTopics.length > 0 && existingModules.length > 0) {
      // Use existing structure - map Content Studio topics to existing modules
      // For now, use first topic/module pair (can be enhanced to map by order)
      topic = existingTopics[0];
      module = existingModules[0];
      console.log('[ContentStudio Handler] Using existing topic:', topic.topic_name, 'and module:', module.module_name);
    } else {
      // Create default structure if none exists
      topic = (await topicRepository.findByCourseId(course.id))[0];
      if (!topic) {
        topic = await topicRepository.create({
          course_id: course.id,
          topic_name: normalized.course_name || 'Topic 1',
          topic_description: normalized.course_description || null,
          skills: [] // Topics are structural only - skills stored on lessons
        });
      }

      module = (await moduleRepository.findByTopicId(topic.id))[0];
      if (!module) {
        module = await moduleRepository.create({
          topic_id: topic.id,
          module_name: 'Module 1',
          module_description: null
        });
      }
    }

    // Create lessons from Content Studio topics[] array (normalized via Content Studio normalizer)
    // Each normalized lesson already has content_data, devlab_exercises, skills, trainer_ids, format_order
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
        devlab_exercises: lessonData.devlab_exercises,
        format_order: lessonData.format_order
      });
      createdLessons.push(lesson);
    }

    // If trainer course: return empty response (one-way communication)
    // Content Studio sends trainer course → Course Builder processes it → No response needed
    if (isTrainerCourse) {
      return {};  // ✅ Empty response for trainer courses (one-way)
    }
    
    // If learner course: return course data (two-way communication)
    // Course Builder → Content Studio request → Course Builder receives course data
    // Build course object from created course and lessons
    const courseData = {
      course_id: course.id,
      course_name: course.course_name,
      course_description: course.course_description,
      course_type: course.course_type,
      status: course.status,
      level: course.level,
      duration_hours: course.duration_hours,
      created_by_user_id: course.created_by_user_id,
      // Add lessons structure
      lessons: createdLessons.map(lesson => ({
        lesson_id: lesson.id,
        lesson_name: lesson.lesson_name,
        lesson_description: lesson.lesson_description,
        skills: lesson.skills,
        content_type: lesson.content_type,
        content_data: lesson.content_data,
        devlab_exercises: lesson.devlab_exercises
      }))
    };
    
    // Return only course field (remove any topics, learner_id, learner_name, learner_company if present)
    return {
      course: [courseData]
    };
  } catch (error) {
    console.error('[ContentStudio Handler] Error:', error);
    
    // Check if we should use fallback data (network/service errors)
    if (shouldUseFallback(error, 'ContentStudio')) {
      console.warn('[ContentStudio Handler] Using fallback data due to service unavailability');
      
      const isLearnerCourse = !!payloadObject.learner_id;
      const variant = isLearnerCourse ? 'learner_specific' : 'trainer';
      const fallback = getFallbackData('ContentStudio', variant);
      
      // If trainer course: return empty response (one-way)
      if (payloadObject.trainer_id) {
        return {};
      }
      
      // If learner course: return fallback course data
      return {
        course: fallback.course || []
      };
    }
    
    // For non-network errors:
    // If trainer course: return empty response (one-way)
    if (payloadObject.trainer_id) {
      return {};
    }
    
    // If learner course: return empty course array
    return {
      course: []
    };
  }
}

export default {
  handleContentStudioIntegration
};

