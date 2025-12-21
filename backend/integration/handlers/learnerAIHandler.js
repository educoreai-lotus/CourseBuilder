/**
 * Learner AI Integration Handler
 * Handles incoming data from Learner AI microservice (via Coordinator)
 * 
 * ACTIVE FLOW (CURRENT):
 * Directory → Skills Engine → Learner AI → Course Builder → Content Studio → Build Course
 * 
 * This is the PRIMARY entry point for Course Builder.
 * Learner AI sends requests TO Course Builder via Coordinator (POST /api/fill-content-metrics).
 * Course Builder then calls Content Studio and builds the course.
 * 
 * NOTE: Course Builder NO LONGER calls Learner AI. Learner AI is the trigger source.
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';
import { sendToContentStudio } from '../../services/gateways/contentStudioGateway.js';
import { handleContentStudioIntegration } from './contentStudioHandler.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';
import courseRepository from '../../repositories/CourseRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import versionRepository from '../../repositories/VersionRepository.js';
import db from '../../config/database.js';
import { generateAIStructure } from '../../services/AIStructureGenerator.js';

/**
 * TEMPORARY: Delete existing failed course before rebuild
 * This is a temporary solution for "rebuild course after learner fails" scenario.
 * TODO: Replace with proper versioning system later.
 * 
 * @param {string} competencyTargetName - Competency target name to match
 * @param {string} userId - Learner user ID (must own the course)
 * @returns {Promise<boolean>} - True if course was found and deleted, false otherwise
 */
async function deleteExistingFailedCourse(competencyTargetName, userId) {
  if (!competencyTargetName || !userId) {
    console.log('[LearnerAI Handler] ⚠️ Cannot delete course: missing competency_target_name or user_id');
    return false;
  }

  try {
    // Find existing course with matching competency and learner
    const existingCourse = await courseRepository.findByCompetencyAndLearner(competencyTargetName, userId);
    
    if (!existingCourse) {
      console.log('[LearnerAI Handler] No existing course found for deletion:', {
        competency_target_name: competencyTargetName,
        user_id: userId
      });
      return false;
    }

    // Safety check: Ensure it's a learner-specific course owned by this learner
    if (existingCourse.course_type !== 'learner_specific') {
      console.warn('[LearnerAI Handler] ⚠️ SAFETY: Cannot delete course - not learner_specific:', {
        course_id: existingCourse.id,
        course_type: existingCourse.course_type
      });
      return false;
    }

    if (existingCourse.created_by_user_id !== userId) {
      console.warn('[LearnerAI Handler] ⚠️ SAFETY: Cannot delete course - not owned by learner:', {
        course_id: existingCourse.id,
        course_owner: existingCourse.created_by_user_id,
        requesting_user: userId
      });
      return false;
    }

    console.log('[LearnerAI Handler] 🗑️ TEMPORARY: Deleting existing failed course before rebuild:', {
      course_id: existingCourse.id,
      course_name: existingCourse.course_name,
      competency_target_name: competencyTargetName,
      user_id: userId
    });

    // Get all related entities for logging before deletion
    const existingTopics = await topicRepository.findByCourseId(existingCourse.id);
    const topicIds = existingTopics.map(t => t.id);
    const moduleIds = [];
    const lessonIds = [];

    for (const topic of existingTopics) {
      const modules = await moduleRepository.findByTopicId(topic.id);
      moduleIds.push(...modules.map(m => m.id));
      
      for (const module of modules) {
        const lessons = await lessonRepository.findByModuleId(module.id);
        lessonIds.push(...lessons.map(l => l.id));
      }
    }

    console.log('[LearnerAI Handler] Entities to be deleted:', {
      course_id: existingCourse.id,
      topics_count: topicIds.length,
      modules_count: moduleIds.length,
      lessons_count: lessonIds.length
    });

    // Delete within a transaction to ensure atomicity
    await db.tx(async (t) => {
      // Delete versions manually (no FK cascade)
      if (topicIds.length > 0) {
        await versionRepository.deleteByEntityIds('topic', topicIds);
      }
      if (moduleIds.length > 0) {
        await versionRepository.deleteByEntityIds('module', moduleIds);
      }
      if (lessonIds.length > 0) {
        await versionRepository.deleteByEntityIds('lesson', lessonIds);
      }
      // Delete course version
      await versionRepository.deleteByEntityIds('course', [existingCourse.id]);

      // Delete course (cascades to topics, modules, lessons, registrations, assessments, feedback)
      await t.none('DELETE FROM courses WHERE id = $1', [existingCourse.id]);
    });

    console.log('[LearnerAI Handler] ✅ Successfully deleted existing course and all dependent entities');
    return true;
  } catch (error) {
    console.error('[LearnerAI Handler] ❌ Error deleting existing course:', error);
    // Don't throw - allow rebuild to proceed even if deletion fails
    // The new course creation will handle the uniqueness constraint
    return false;
  }
}

/**
 * Handle Learner AI integration request
 * @param {Object} payloadObject - Parsed payload from Learner AI
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleLearnerAIIntegration(payloadObject, responseTemplate) {
  try {
    // Log raw incoming request BEFORE any processing
    console.log(`
==================== LEARNER AI ====================
Received payload:
${JSON.stringify(payloadObject, null, 2)}
================== END LEARNER AI ==================
`);

    // Normalize Learner AI payload (for Course Builder internal logic only)
    const data = learnerAIDTO.buildFromReceived(payloadObject);

    // Normalize exam_status for logging (case-insensitive)
    const normalizedExamStatus = payloadObject.exam_status?.toLowerCase() || null;

    console.log('[LearnerAI Handler] Received from Learner AI:', {
      user_id: data.user_id,
      user_name: data.user_name,
      skills: data.skills?.length || 0,
      competency_name: data.competency_name,
      has_learning_path: !!data.learning_path,
      preferred_language: data.preferred_language,
      exam_status: normalizedExamStatus
    });

    // TEMPORARY: Delete existing course before rebuild (if exists)
    // Primary trigger: Existing learner-specific course found for same competency + learner
    // This ensures a learner can never have two learner-specific courses with the same competency_target_name
    // TODO: Replace with proper versioning system later
    if (data.competency_name && data.user_id) {
      const existingCourse = await courseRepository.findByCompetencyAndLearner(
        data.competency_name,
        data.user_id
      );

      if (existingCourse) {
        // Safety checks: only delete learner_specific courses owned by this learner
        if (existingCourse.course_type === 'learner_specific' && 
            existingCourse.created_by_user_id === data.user_id) {
          console.log('[LearnerAI Handler] 🔄 TEMPORARY: REBUILD - Existing learner-specific course found for same competency; deleting before rebuild', {
            existing_course_id: existingCourse.id,
            competency_target_name: data.competency_name,
            user_id: data.user_id,
            exam_status: normalizedExamStatus
          });
          await deleteExistingFailedCourse(data.competency_name, data.user_id);
        } else {
          console.log('[LearnerAI Handler] ⚠️ SAFETY: Existing course found but not eligible for deletion', {
            course_id: existingCourse.id,
            course_type: existingCourse.course_type,
            course_owner: existingCourse.created_by_user_id,
            requesting_user: data.user_id
          });
        }
      } else {
        console.log('[LearnerAI Handler] ✅ FIRST-TIME: No existing course found; proceeding with normal course creation', {
          competency_target_name: data.competency_name,
          user_id: data.user_id,
          exam_status: normalizedExamStatus
        });
      }
    }

    // Step 1: Create course structure (course, topics, modules) BEFORE calling Content Studio
    // This ensures the course structure exists in the database immediately
    let course = null;
    let createdTopics = [];
    let createdModules = [];
    
    if (data.learning_path) {
      console.log('[LearnerAI Handler] Step 1: Creating course structure from learning path...');
      
      // Create course
      const courseName = data.competency_name || data.learning_path.path_title || 'Personalized Course';
      course = await courseRepository.create({
        course_name: courseName,
        course_description: `Personalized learning path: ${data.learning_path.path_title || courseName}`,
        course_type: 'learner_specific',
        status: 'active',
        level: null,
        duration_hours: data.learning_path.total_estimated_duration_hours || null,
        created_by_user_id: data.user_id,
        learning_path_designation: {
          is_designated: true,
          source: 'learner_ai',
          flow: 'CAREER_PATH_DRIVEN',
          competency_target_name: data.competency_name,
          structured_path: true
        }
      });
      
      console.log('[LearnerAI Handler] ✅ Course created:', course.id, '-', course.course_name);
      
      // Create topics using AI and modules from learning_path structure
      if (data.learning_path.learning_modules && Array.isArray(data.learning_path.learning_modules)) {
        // Sort modules by module_order
        const sortedModules = [...data.learning_path.learning_modules].sort(
          (a, b) => (a.module_order || 0) - (b.module_order || 0)
        );
        
        // Step 1: Prepare AI input - convert learning modules to synthetic lessons for AI
        const learningPathForAI = [
          {
            name: data.learning_path.path_title,
            topicName: data.learning_path.path_title
          }
        ];
        
        // Flatten skills from all modules
        const skillsSet = new Set();
        for (const moduleData of sortedModules) {
          const skillsInModule = Array.isArray(moduleData.skills_in_module)
            ? moduleData.skills_in_module
            : moduleData.skills_in_module
            ? [moduleData.skills_in_module]
            : [];
          for (const skill of skillsInModule) {
            skillsSet.add(skill);
          }
        }
        const skillsForAI = Array.from(skillsSet);
        
        // Convert learning modules to synthetic lessons for AI
        const allLessonsForAI = sortedModules.map((moduleData, index) => {
          const moduleOrder = moduleData.module_order || index + 1;
          const lessonId = `module_${moduleOrder}`;
          
          // Build description from steps
          const descriptionPieces = [];
          if (Array.isArray(moduleData.steps)) {
            for (const step of moduleData.steps) {
              if (step.title) descriptionPieces.push(step.title);
              if (step.description) descriptionPieces.push(step.description);
            }
          }
          
          return {
            lessonId,
            lessonName: moduleData.module_title || `Module ${moduleOrder}`,
            description: descriptionPieces.join(' ').slice(0, 500),
            content_data: [],
            skills: Array.isArray(moduleData.skills_in_module)
              ? moduleData.skills_in_module
              : moduleData.skills_in_module
              ? [moduleData.skills_in_module]
              : []
          };
        });
        
        // Step 2: Generate topic structure using AI
        console.log('[LearnerAI Handler] Generating topic structure using AI...');
        const aiStructureResult = await generateAIStructure({
          learningPath: learningPathForAI,
          skills: skillsForAI,
          allLessons: allLessonsForAI
        });
        
        if (!aiStructureResult || !aiStructureResult.structure || !Array.isArray(aiStructureResult.structure.topics)) {
          console.warn('[LearnerAI Handler] AI structure generation failed, using fallback');
          // Fallback: create one topic per module
          for (const moduleData of sortedModules) {
            const topic = await topicRepository.create({
              course_id: course.id,
              topic_name: moduleData.module_title || `Topic ${createdTopics.length + 1}`,
              topic_description: moduleData.module_description || null
            });
            createdTopics.push(topic);
          }
        } else {
          // Step 3: Create topics from AI structure
          const aiTopics = aiStructureResult.structure.topics;
          for (const aiTopic of aiTopics) {
            const topic = await topicRepository.create({
              course_id: course.id,
              topic_name: aiTopic.topic_name,
              topic_description: aiTopic.topic_description || null
            });
            createdTopics.push(topic);
            console.log('[LearnerAI Handler] ✅ Created AI-generated topic:', topic.topic_name);
          }
        }
        
        // Step 4: Create modules from learning_modules array (one module per learning_module)
        // Map modules to topics based on AI grouping
        const moduleIdToTopicIndex = new Map();
        if (aiStructureResult?.structure?.topics) {
          // Build mapping from AI structure
          aiStructureResult.structure.topics.forEach((aiTopic, topicIndex) => {
            if (Array.isArray(aiTopic.modules)) {
              for (const aiModule of aiTopic.modules) {
                if (Array.isArray(aiModule.lesson_ids)) {
                  for (const lessonId of aiModule.lesson_ids) {
                    // Extract module_order from lessonId (format: "module_1", "module_2", etc.)
                    const moduleOrderMatch = lessonId.match(/module_(\d+)/);
                    if (moduleOrderMatch) {
                      const moduleOrder = parseInt(moduleOrderMatch[1], 10);
                      moduleIdToTopicIndex.set(moduleOrder, topicIndex);
                    }
                  }
                }
              }
            }
          });
        }
        
        // Create modules from learning_modules array
        for (let i = 0; i < sortedModules.length; i++) {
          const moduleData = sortedModules[i];
          const moduleOrder = moduleData.module_order || (i + 1);
          
          // Find which topic this module belongs to (from AI grouping)
          let topicIndex = moduleIdToTopicIndex.get(moduleOrder);
          if (topicIndex === undefined) {
            // Fallback: assign to first topic or create one if none exist
            topicIndex = 0;
            if (createdTopics.length === 0) {
              const fallbackTopic = await topicRepository.create({
                course_id: course.id,
                topic_name: 'Topic 1',
                topic_description: null
              });
              createdTopics.push(fallbackTopic);
            }
          }
          
          const assignedTopic = createdTopics[topicIndex];
          
          // Create module from learning_module data
          const module = await moduleRepository.create({
            topic_id: assignedTopic.id,
            module_name: moduleData.module_title || `Module ${createdModules.length + 1}`,
            module_description: moduleData.module_description || null
          });
          createdModules.push({
            ...module,
            module_order: moduleOrder,
            topic_id: assignedTopic.id
          });
          
          console.log('[LearnerAI Handler] ✅ Created module:', module.module_name, 'in topic:', assignedTopic.topic_name);
        }
        
        console.log('[LearnerAI Handler] ✅ Course structure created:', {
          course_id: course.id,
          topics_count: createdTopics.length,
          modules_count: createdModules.length
        });
      }
    }

    // Step 2: Call Content Studio to generate personalized lessons
    // CRITICAL: Send the EXACT payload received from Learner AI to Content Studio
    // ONLY action and description may be overridden - everything else must be UNMODIFIED
    console.log('[LearnerAI Handler] Step 2: Calling Content Studio to generate lessons...');
    
    // Build Content Studio payload: EXACT copy of payloadObject with ONLY action/description overridden
    // NO mappings, NO renaming, NO restructuring - Content Studio receives the same structure as Learner AI
    const contentStudioPayload = {
      ...payloadObject, // Copy ALL fields from Learner AI payload AS-IS
      action: 'generate_course_content', // Override action only
      description: 'Generate course content from learning path', // Override description only
      course_id: course?.id // Include course_id if course was created
    };

    // Log exact outgoing request BEFORE calling Content Studio
    console.log(`
================= CONTENT STUDIO ===================
Sent payload:
${JSON.stringify(contentStudioPayload, null, 2)}
=============== END CONTENT STUDIO =================
`);

    let contentStudioResponse;
    try {
      contentStudioResponse = await sendToContentStudio(contentStudioPayload);
      
      // Log response structure to debug
      console.log('[LearnerAI Handler] Content Studio response received:');
      console.log('- Has course:', !!contentStudioResponse.course);
      if (contentStudioResponse.course) {
        console.log('- Course array length:', Array.isArray(contentStudioResponse.course) ? contentStudioResponse.course.length : 'NOT ARRAY');
      }
    } catch (contentStudioError) {
      console.error('[LearnerAI Handler] Content Studio call failed:', contentStudioError.message);
      
      // If Content Studio fails, use fallback data
      if (shouldUseFallback(contentStudioError, 'ContentStudio')) {
        console.warn('[LearnerAI Handler] Using fallback data for Content Studio');
        const fallback = getFallbackData('ContentStudio', 'learner_specific');
        contentStudioResponse = {
          learner_id: data.user_id,
          learner_name: data.user_name,
          learner_company: data.company_name || '',
          topics: fallback.topics || []
        };
      } else {
        throw contentStudioError;
      }
    }

    // Step 3: Process Content Studio response and create/update lessons
    // Extract topics from response.course[] (Content Studio returns course[] array with all content)
    let topicsToProcess = [];
    
    if (contentStudioResponse.course && Array.isArray(contentStudioResponse.course)) {
      // Content Studio returns course[] array, extract topics from each course
      // IMPORTANT: Ignore any course_id from Content Studio response - we already have our own course_id
      console.log('[LearnerAI Handler] Extracting topics from response.course[] array');
      console.log('[LearnerAI Handler] ⚠️ Ignoring any course_id from Content Studio response - using our own course_id:', course?.id);
      for (const courseData of contentStudioResponse.course) {
        if (courseData.topics && Array.isArray(courseData.topics)) {
          topicsToProcess.push(...courseData.topics);
        }
        // Explicitly ignore course_id from Content Studio response
        if (courseData.course_id) {
          console.log('[LearnerAI Handler] Ignoring course_id from Content Studio:', courseData.course_id);
        }
      }
    } else {
      console.warn('[LearnerAI Handler] ⚠️ Content Studio response does not have course[] array');
    }
    
    if (topicsToProcess.length > 0) {
      console.log('[LearnerAI Handler] Step 3: Processing', topicsToProcess.length, 'topics from Content Studio...');
      
      const contentStudioResponseTemplate = {
        learner_id: contentStudioResponse.learner_id || data.user_id,
        learner_name: contentStudioResponse.learner_name || data.user_name,
        learner_company: contentStudioResponse.learner_company || data.company_name || '',
        topics: topicsToProcess
      };

      // Update course structure with Content Studio content (creates lessons)
      // Pass course_id so handler knows to use existing course
      await handleContentStudioIntegration(
        {
          course_id: course?.id, // Pass existing course_id
          learner_id: contentStudioResponse.learner_id || data.user_id,
          learner_name: contentStudioResponse.learner_name || data.user_name,
          learner_company: contentStudioResponse.learner_company || data.company_name || '',
          skills: data.skills || [],
          topics: topicsToProcess
        },
        contentStudioResponseTemplate
      );
      
      console.log('[LearnerAI Handler] ✅ Course structure updated with Content Studio lessons');
    } else {
      console.warn('[LearnerAI Handler] ⚠️ No topics found in Content Studio response. Course structure created but no lessons added.');
    }

    // Learner AI → Course Builder is one-way communication
    // Course Builder processes the request and creates course, no response needed
    return {};  // ✅ Empty response for Learner AI (one-way)
  } catch (error) {
    console.error('[LearnerAI Handler] Error:', error);
    
    // Learner AI is one-way communication, return empty response even on error
    return {};  // ✅ Empty response for Learner AI (one-way)
  }
}

export default {
  handleLearnerAIIntegration
};

