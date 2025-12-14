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
 * @param {string|null} requestId - Request ID for logging (optional)
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleContentStudioIntegration(payloadObject, responseTemplate, requestId = null) {
  const logPrefix = requestId ? `[ContentStudio Handler] [${requestId}]` : '[ContentStudio Handler]';
  const startTime = Date.now();
  
  try {
    console.log(`${logPrefix} 🚀 Starting ContentStudio handler`);
    console.log(`${logPrefix} 📦 Payload keys: ${Object.keys(payloadObject).join(', ')}`);
    console.log(`${logPrefix} 📦 Payload:`, JSON.stringify(payloadObject, null, 2));
    console.log(`${logPrefix} 📋 Response template:`, JSON.stringify(responseTemplate, null, 2));
    
    // Normalize Content Studio payload (topics[] → lessons[])
    console.log(`${logPrefix} 🔄 Normalizing Content Studio payload...`);
    const normalized = normalizeContentStudioPayload(payloadObject);
    console.log(`${logPrefix} ✅ Payload normalized`);
    console.log(`${logPrefix} 📦 Normalized payload:`, JSON.stringify(normalized, null, 2));

    // Determine if trainer or learner course
    const isTrainerCourse = !!normalized.trainer_id;
    console.log(`${logPrefix} 📋 Course type: ${isTrainerCourse ? 'Trainer' : 'Learner-specific'}`);
    
    // Create or update course
    console.log(`${logPrefix} 🔍 Looking up course: ${normalized.course_id || 'NEW'}`);
    let course = await courseRepository.findById(normalized.course_id);
    
    if (!course && isTrainerCourse) {
      // Create new trainer course
      console.log(`${logPrefix} ➕ Creating new trainer course...`);
      course = await courseRepository.create({
        id: normalized.course_id,
        course_name: normalized.course_name,
        course_description: normalized.course_description,
        course_type: 'trainer',
        status: 'draft',
        created_by_user_id: normalized.trainer_id
      });
      console.log(`${logPrefix} ✅ Trainer course created: ${course.id}`);
    } else if (!course && !isTrainerCourse) {
      // Create learner-specific course
      console.log(`${logPrefix} ➕ Creating new learner-specific course...`);
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
      console.log(`${logPrefix} ✅ Learner-specific course created: ${course.id}`);
    } else {
      console.log(`${logPrefix} ✅ Course found: ${course.id}`);
    }

    // Create Topic → Module structure (structural containers)
    // Use default: Topic 1 / Module 1
    console.log(`${logPrefix} 🔍 Looking up topic for course...`);
    let topic = (await topicRepository.findByCourseId(course.id))[0];
    if (!topic) {
      console.log(`${logPrefix} ➕ Creating topic...`);
      topic = await topicRepository.create({
        course_id: course.id,
        topic_name: normalized.course_name || 'Topic 1',
        topic_description: normalized.course_description || null,
        skills: [] // Topics are structural only - skills stored on lessons
      });
      console.log(`${logPrefix} ✅ Topic created: ${topic.id}`);
    } else {
      console.log(`${logPrefix} ✅ Topic found: ${topic.id}`);
    }

    console.log(`${logPrefix} 🔍 Looking up module for topic...`);
    let module = (await moduleRepository.findByTopicId(topic.id))[0];
    if (!module) {
      console.log(`${logPrefix} ➕ Creating module...`);
      module = await moduleRepository.create({
        topic_id: topic.id,
        module_name: 'Module 1',
        module_description: null
      });
      console.log(`${logPrefix} ✅ Module created: ${module.id}`);
    } else {
      console.log(`${logPrefix} ✅ Module found: ${module.id}`);
    }

    // Create lessons from Content Studio topics[] array
    // Each Content Studio topic becomes a Course Builder lesson
    console.log(`${logPrefix} 📚 Creating ${normalized.lessons.length} lesson(s)...`);
    const createdLessons = [];
    for (let i = 0; i < normalized.lessons.length; i++) {
      const lessonData = normalized.lessons[i];
      console.log(`${logPrefix} ➕ Creating lesson ${i + 1}/${normalized.lessons.length}: ${lessonData.lesson_name || 'Unnamed'}`);
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
      console.log(`${logPrefix} ✅ Lesson created: ${lesson.id}`);
    }
    console.log(`${logPrefix} ✅ All ${createdLessons.length} lesson(s) created`);

    // If trainer course: return empty response (one-way communication)
    // Content Studio sends trainer course → Course Builder processes it → No response needed
    if (isTrainerCourse) {
      const totalDuration = Date.now() - startTime;
      console.log(`${logPrefix} ✅ Trainer course processed in ${totalDuration}ms`);
      console.log(`${logPrefix} 📤 Returning empty response (one-way communication)`);
      return {};  // ✅ Empty response for trainer courses (one-way)
    }
    
    // If learner course: return course data (two-way communication)
    // Course Builder → Content Studio request → Course Builder receives course data
    // Build course object from created course and lessons
    console.log(`${logPrefix} 📦 Building response for learner course...`);
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
    const response = {
      course: [courseData]
    };
    
    const totalDuration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ Learner course processed in ${totalDuration}ms`);
    console.log(`${logPrefix} 📤 Returning response with ${response.course.length} course(s) and ${response.course[0]?.lessons?.length || 0} lesson(s)`);
    console.log(`${logPrefix} 📦 Response:`, JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ ERROR after ${totalDuration}ms:`, error);
    console.error(`${logPrefix} Error stack:`, error.stack);
    
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

