/**
 * Build Course From Learning Path Service
 * Builds course structure directly from Learner AI's structured Learning Path JSON
 * 
 * This service persists the structure AS-IS without reinterpreting or regenerating it.
 * Learner AI has already decided module order, lesson order, grouped skills, and calculated durations.
 */

import courseRepository from '../repositories/CourseRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import { PendingCourseCreationError } from '../utils/PendingCourseCreationError.js';

/**
 * Build course from structured Learning Path JSON
 * @param {Object} learningPathJson - Structured Learning Path JSON from Learner AI
 * @param {string} learningPathJson.learner_id - Learner ID
 * @param {string} learningPathJson.path_title - Course title
 * @param {Array} learningPathJson.learning_modules - Array of learning modules
 * @param {number} learningPathJson.total_estimated_duration_hours - Total duration
 * @returns {Promise<string>} - Course ID of created course
 */
export async function buildCourseFromLearningPath(learningPathJson) {
  try {
    console.log('[Build Course From Learning Path] Starting course creation from structured JSON');
    console.log('[Build Course From Learning Path] Path title:', learningPathJson.path_title);
    console.log('[Build Course From Learning Path] Modules count:', learningPathJson.learning_modules?.length || 0);
    
    // Validate required fields
    if (!learningPathJson.learner_id) {
      throw new Error('learner_id is required in Learning Path JSON');
    }
    
    if (!learningPathJson.path_title) {
      throw new Error('path_title is required in Learning Path JSON');
    }
    
    // Validate learning_modules
    if (!learningPathJson.learning_modules || !Array.isArray(learningPathJson.learning_modules)) {
      throw new PendingCourseCreationError(
        'Course creation cannot complete yet - no learning modules available',
        `Learning Path JSON missing or invalid learning_modules array for learner ${learningPathJson.learner_id}. Course creation is pending.`
      );
    }
    
    if (learningPathJson.learning_modules.length === 0) {
      throw new PendingCourseCreationError(
        'Course creation cannot complete yet - no learning modules available',
        `Learning Path JSON has empty learning_modules array for learner ${learningPathJson.learner_id}. Course creation is pending.`
      );
    }
    
    // Validate each module has steps
    for (const module of learningPathJson.learning_modules) {
      if (!module.steps || !Array.isArray(module.steps) || module.steps.length === 0) {
        throw new Error(
          `Invalid Learning Path blueprint: Module "${module.module_title || 'Unknown'}" has no steps. Each module must have at least one step.`
        );
      }
    }
    
    // Step 1: Create Course
    console.log('[Build Course From Learning Path] Step 1: Creating course...');
    const course = await courseRepository.create({
      course_name: learningPathJson.path_title,
      course_description: `Personalized learning path: ${learningPathJson.path_title}`,
      course_type: 'learner_specific',
      status: 'active',
      duration_hours: learningPathJson.total_estimated_duration_hours || null,
      created_by_user_id: learningPathJson.learner_id,
      learning_path_designation: {
        is_designated: true,
        source: 'learner_ai',
        structured_path: true
      }
    });
    
    console.log('[Build Course From Learning Path] Course created:', course.id);
    
    // Step 2: Sort learning_modules by module_order to preserve ordering
    const sortedModules = [...learningPathJson.learning_modules].sort((a, b) => (a.module_order || 0) - (b.module_order || 0));
    
    // Step 3: Create Topics and Modules (ONE topic per module, preserve ordering)
    console.log('[Build Course From Learning Path] Step 2: Creating topics and modules (one topic per module)...');
    const modules = [];
    
    for (const moduleData of sortedModules) {
      // Create topic for this module
      const topic = await topicRepository.create({
        course_id: course.id,
        topic_name: moduleData.module_title || `Module ${moduleData.module_order || modules.length + 1}`,
        topic_description: `Module: ${moduleData.module_title || 'Learning Module'}`
      });
      
      // Create module linked to this topic
      const module = await moduleRepository.create({
        topic_id: topic.id,
        module_name: moduleData.module_title,
        module_description: `Estimated duration: ${moduleData.estimated_duration_hours || 'N/A'} hours`
      });
      
      modules.push({
        ...module,
        module_order: moduleData.module_order || modules.length + 1,
        original_module: moduleData,
        topic_id: topic.id
      });
    }
    
    console.log('[Build Course From Learning Path] Topics and modules created:', modules.length);
    
    // Step 4: Create Lessons from module steps (preserve ordering)
    // Modules are already sorted by module_order from Step 2
    console.log('[Build Course From Learning Path] Step 4: Creating lessons from module steps...');
    let totalLessons = 0;
    
    for (const moduleData of modules) {
      const module = moduleData.original_module;
      
      // Sort steps by step number to preserve ordering
      const sortedSteps = [...module.steps].sort((a, b) => (a.step || 0) - (b.step || 0));
      
      for (const step of sortedSteps) {
        await lessonRepository.create({
          module_id: moduleData.id,
          topic_id: moduleData.topic_id,
          lesson_name: step.title || `Step ${step.step || totalLessons + 1}`,
          lesson_description: step.description || null,
          skills: step.skills_covered || [], // JSONB array
          trainer_ids: [], // No trainers for learner-specific courses
          content_type: 'ai_generated',
          content_data: [
            {
              estimatedTime: step.estimatedTime || null,
              step: step.step || null,
              type: 'learning_step'
            }
          ],
          devlab_exercises: [] // Empty for now
        });
        totalLessons++;
      }
    }
    
    console.log('[Build Course From Learning Path] Lessons created:', totalLessons);
    console.log('[Build Course From Learning Path] ✅ Course creation completed successfully:', course.id);
    
    return course.id;
  } catch (error) {
    // If it's already a PendingCourseCreationError, re-throw it as-is
    if (error instanceof PendingCourseCreationError) {
      throw error;
    }
    
    // For other errors, wrap in generic error (these are real failures)
    console.error('[Build Course From Learning Path] Error building course from Learning Path:', error);
    throw new Error(`Failed to build course from Learning Path: ${error.message}`);
  }
}

export default {
  buildCourseFromLearningPath
};

