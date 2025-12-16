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
import registrationRepository from '../repositories/RegistrationRepository.js';
import { PendingCourseCreationError } from '../utils/PendingCourseCreationError.js';
import { generateAIStructure } from './AIStructureGenerator.js';
import { sendToContentStudio } from './gateways/contentStudioGateway.js';

/**
 * Build course from structured Learning Path JSON
 * @param {Object} learningPathJson - Structured Learning Path JSON from Learner AI
 * @param {string} learningPathJson.learner_id - Learner ID
 * @param {string} learningPathJson.path_title - Course title
 * @param {Array} learningPathJson.learning_modules - Array of learning modules
 * @param {number} learningPathJson.total_estimated_duration_hours - Total duration
 * @param {Object} contentStudioResponse - Content Studio response with courses[] array (optional, will be fetched if not provided)
 * @param {Object} learnerAIDataResponse - Full Learner AI data response (with learners_data and career_learning_paths) to send to Content Studio AS-IS (optional)
 * @returns {Promise<string>} - Course ID of created course
 */
export async function buildCourseFromLearningPath(learningPathJson, contentStudioResponse = null, learnerAIDataResponse = null) {
  try {
    console.log('[Build Course From Learning Path] ========== STARTING COURSE CREATION ==========');
    console.log('[Build Course From Learning Path] Starting course creation from structured JSON');
    console.log('[Build Course From Learning Path] Path title:', learningPathJson.path_title);
    console.log('[Build Course From Learning Path] Modules count:', learningPathJson.learning_modules?.length || 0);
    console.log('[Build Course From Learning Path] Learner ID:', learningPathJson.learner_id);
    console.log('[Build Course From Learning Path] Content Studio response provided:', !!contentStudioResponse);
    
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
    // ⚠️ Mapping rules for AI-created / CAREER_PATH_DRIVEN courses:
    // - course_name: competency_target_name from career_learning_paths[i]
    // - course_description: "Personalized learning path: <learning_path.path_title>"
    // - course_type: 'learner_specific'
    // - status: 'active'
    // - level: use global difficulty if provided, otherwise NULL
    // - duration_hours: learning_path.total_estimated_duration_hours (or NULL)
    // - start_date: NULL (self-paced)
    // - created_by_user_id: learner_id / user_id (never AI/system ID)
    // - learning_path_designation: {
    //     is_designated: true,
    //     source: 'learner_ai',
    //     flow: 'CAREER_PATH_DRIVEN',
    //     competency_target_name: '<from wrapper>',
    //     structured_path: true
    //   }
    console.log('[Build Course From Learning Path] Step 1: Creating course...');
    const course = await courseRepository.create({
      course_name: learningPathJson.competency_target_name || learningPathJson.path_title,
      course_description: `Personalized learning path: ${learningPathJson.path_title}`,
      course_type: 'learner_specific',
      status: 'active',
      // If a global difficulty/level is ever added to the Learning Path JSON, map it here.
      // For now, let it be NULL when not provided.
      level: learningPathJson.level || null,
      duration_hours: learningPathJson.total_estimated_duration_hours || null,
      created_by_user_id: learningPathJson.learner_id,
      learning_path_designation: {
        is_designated: true,
        source: 'learner_ai',
        flow: learningPathJson.learning_flow || 'CAREER_PATH_DRIVEN',
        competency_target_name: learningPathJson.competency_target_name,
        structured_path: true
      }
    });
    
    console.log('[Build Course From Learning Path] ✅ Course created successfully:', course.id);
    console.log('[Build Course From Learning Path] Course name:', course.course_name);
    
    // Step 2: Use AI to decide Topic NAMES and module-to-topic grouping
    // ⚠️ AI sees ONLY Learner AI learning_modules (no Content Studio content).
    console.log('[Build Course From Learning Path] Step 2: Generating topic structure from learning modules (AI)...');

    // Sort learning_modules by module_order to preserve original order
    const sortedModules = [...learningPathJson.learning_modules].sort(
      (a, b) => (a.module_order || 0) - (b.module_order || 0)
    );

    // Build AI input:
    // - learningPath: high-level summary (path title)
    // - skills: flattened skills_in_module[]
    // - allLessons: each learning_module represented as a synthetic "lesson"
    const learningPathForAI = [
      {
        name: learningPathJson.path_title,
        topicName: learningPathJson.path_title
      }
    ];

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

    // Map synthetic lessonIds -> module data (module_order, original module)
    const lessonIdToModule = new Map();
    const allLessonsForAI = sortedModules.map((moduleData, index) => {
      const moduleOrder = moduleData.module_order || index + 1;
      const lessonId = `module_${moduleOrder}`;

      // Build a lightweight text summary from steps (titles/descriptions only)
      const descriptionPieces = [];
      if (Array.isArray(moduleData.steps)) {
        for (const step of moduleData.steps) {
          if (step.title) descriptionPieces.push(step.title);
          if (step.description) descriptionPieces.push(step.description);
        }
      }

      lessonIdToModule.set(lessonId, {
        moduleData,
        module_order: moduleOrder
      });

      return {
        lessonId,
        lessonName: moduleData.module_title || `Module ${moduleOrder}`,
        description: descriptionPieces.join(' ').slice(0, 500),
        // No Content Studio content here; only Learner AI metadata
        content_data: [],
        skills: Array.isArray(moduleData.skills_in_module)
          ? moduleData.skills_in_module
          : moduleData.skills_in_module
          ? [moduleData.skills_in_module]
          : []
      };
    });

    const aiStructureResult = await generateAIStructure({
      learningPath: learningPathForAI,
      skills: skillsForAI,
      allLessons: allLessonsForAI
    });

    // 2.3 Validate AI output - allow fallback for edge cases (e.g., single module)
    if (!aiStructureResult || !aiStructureResult.structure) {
      throw new Error(
        '[Build Course From Learning Path] AI structure generation failed completely. No structure available.'
      );
    }
    
    // Log if fallback was used (but don't abort)
    if (aiStructureResult.source === 'fallback') {
      console.warn('[Build Course From Learning Path] ⚠️ Using fallback structure (AI validation failed or edge case)');
    }

    const { structure } = aiStructureResult;
    if (!structure || !Array.isArray(structure.topics) || structure.topics.length === 0) {
      throw new Error('[Build Course From Learning Path] AI structure missing topics array');
    }

    const topicCount = structure.topics.length;
    const maxTopics = Math.min(6, sortedModules.length); // 3–6 typically, but cap by module count
    if (topicCount < 1 || topicCount > maxTopics) {
      throw new Error(
        `[Build Course From Learning Path] AI returned invalid topic count: ${topicCount} (max allowed: ${maxTopics})`
      );
    }

    // Expected synthetic IDs for all modules
    const expectedLessonIds = new Set(allLessonsForAI.map(l => l.lessonId));
    const lessonIdToTopicIndex = new Map();

    structure.topics.forEach((topic, topicIndex) => {
      if (!Array.isArray(topic.modules) || topic.modules.length === 0) {
        throw new Error(
          `[Build Course From Learning Path] Topic "${topic.topic_name || topicIndex}" has no modules array from AI`
        );
      }

      for (const moduleGroup of topic.modules) {
        if (!Array.isArray(moduleGroup.lesson_ids) || moduleGroup.lesson_ids.length === 0) {
          throw new Error(
            `[Build Course From Learning Path] Module group in topic "${
              topic.topic_name || topicIndex
            }" has empty lesson_ids`
          );
        }

        for (const lessonId of moduleGroup.lesson_ids) {
          if (!expectedLessonIds.has(lessonId)) {
            throw new Error(
              `[Build Course From Learning Path] AI referenced unknown module/lesson id: ${lessonId}`
            );
          }
          if (lessonIdToTopicIndex.has(lessonId)) {
            throw new Error(
              `[Build Course From Learning Path] AI assigned module/lesson id "${lessonId}" to multiple topics`
            );
          }
          lessonIdToTopicIndex.set(lessonId, topicIndex);
        }
      }
    });

    // Ensure every module is assigned exactly once
    for (const expectedId of expectedLessonIds) {
      if (!lessonIdToTopicIndex.has(expectedId)) {
        throw new Error(
          `[Build Course From Learning Path] AI did not assign module/lesson id "${expectedId}" to any topic`
        );
      }
    }

    // Step 3: Persist Topics and Modules based on AI grouping
    console.log('[Build Course From Learning Path] Step 3: Creating topics and modules from AI structure...');

    // 2.4 Persist Topics
    const createdTopics = [];
    structure.topics.forEach((topic, topicIndex) => {
      createdTopics.push(null); // placeholder to preserve indices
    });

    for (let topicIndex = 0; topicIndex < structure.topics.length; topicIndex++) {
      const topic = structure.topics[topicIndex];
      const topicRow = await topicRepository.create({
        course_id: course.id,
        topic_name: topic.topic_name || `Topic ${topicIndex + 1}`,
        topic_description: topic.topic_description || null
      });
      createdTopics[topicIndex] = topicRow;
    }

    // 2.5 Persist Modules
    const modules = [];

    for (const moduleEntry of allLessonsForAI) {
      const { lessonId } = moduleEntry;
      const mapping = lessonIdToModule.get(lessonId);
      if (!mapping) {
        throw new Error(
          `[Build Course From Learning Path] Internal error: No module mapping found for lessonId "${lessonId}"`
        );
      }

      const { moduleData, module_order } = mapping;
      const topicIndex = lessonIdToTopicIndex.get(lessonId);
      const topicRow = createdTopics[topicIndex];

      const module = await moduleRepository.create({
        topic_id: topicRow.id,
        module_name: moduleData.module_title,
        module_description: moduleData.module_description || null
      });

      modules.push({
        ...module,
        module_order,
        original_module: moduleData,
        topic_id: topicRow.id
      });
    }

    console.log('[Build Course From Learning Path] Topics and modules created:', modules.length);
    
    // Step 3: Call Content Studio to get lesson content (if not already provided)
    console.log('[Build Course From Learning Path] Step 3: Fetching lesson content from Content Studio...');
    console.log('[Build Course From Learning Path] Content Studio response provided:', !!contentStudioResponse);
    
    if (!contentStudioResponse) {
      console.log('[Build Course From Learning Path] Content Studio response not provided, calling Content Studio...');
      
      // If we have the full Learner AI data response, send it AS-IS to Content Studio
      if (learnerAIDataResponse) {
        console.log('[Build Course From Learning Path] Sending full Learner AI data response to Content Studio AS-IS');
        console.log('[Build Course From Learning Path] Learner AI data response keys:', Object.keys(learnerAIDataResponse));
        
        contentStudioResponse = await sendToContentStudio({
          learner_ai_data: learnerAIDataResponse // Send the full data object AS-IS
        });
      } else {
        // Fallback: Build Content Studio request payload from learning modules (legacy path)
        console.log('[Build Course From Learning Path] No Learner AI data response provided, using legacy payload structure');
        const skillsForContentStudio = new Set();
        for (const moduleData of sortedModules) {
          const skillsInModule = Array.isArray(moduleData.skills_in_module)
            ? moduleData.skills_in_module
            : moduleData.skills_in_module
            ? [moduleData.skills_in_module]
            : [];
          for (const skill of skillsInModule) {
            skillsForContentStudio.add(skill);
          }
        }
        
        contentStudioResponse = await sendToContentStudio({
          learnerData: {
            learner_id: learningPathJson.learner_id,
            learner_name: learningPathJson.learner_name || 'Learner',
            learner_company: learningPathJson.company_name || null
          },
          skills: Array.from(skillsForContentStudio),
          learning_path: sortedModules.map(m => ({
            module_order: m.module_order,
            module_title: m.module_title,
            steps: m.steps
          }))
        });
      }
      console.log('[Build Course From Learning Path] ✅ Content Studio response received');
      console.log('[Build Course From Learning Path] Content Studio response structure:', {
        hasCourses: !!contentStudioResponse.courses,
        hasCourse: !!contentStudioResponse.course,
        isArray: Array.isArray(contentStudioResponse),
        coursesLength: contentStudioResponse.courses?.length || contentStudioResponse.course?.length || 0
      });
    } else {
      console.log('[Build Course From Learning Path] Using provided Content Studio response');
      console.log('[Build Course From Learning Path] Content Studio response structure:', {
        hasCourses: !!contentStudioResponse.courses,
        hasCourse: !!contentStudioResponse.course,
        isArray: Array.isArray(contentStudioResponse),
        coursesLength: contentStudioResponse.courses?.length || contentStudioResponse.course?.length || 0
      });
    }
    
    // Step 4: Create Lessons from Content Studio response using index-based mapping
    console.log('[Build Course From Learning Path] Step 4: Creating lessons from Content Studio response...');
    console.log('[Build Course From Learning Path] Raw Content Studio response keys:', Object.keys(contentStudioResponse || {}));
    
    // CRITICAL CONTRACT: Validate index-based mapping
    // Content Studio MUST return courses[] array (one course per learning_module)
    // Handle both response.courses[] and response.course[] (legacy) for compatibility
    let contentStudioCourses = null;
    if (Array.isArray(contentStudioResponse.courses)) {
      contentStudioCourses = contentStudioResponse.courses;
    } else if (Array.isArray(contentStudioResponse.course)) {
      contentStudioCourses = contentStudioResponse.course;
    } else if (Array.isArray(contentStudioResponse)) {
      contentStudioCourses = contentStudioResponse;
    } else if (contentStudioResponse && typeof contentStudioResponse === 'object') {
      // Single course object - wrap in array
      contentStudioCourses = [contentStudioResponse];
    } else {
      throw new Error(
        '[Build Course From Learning Path] Content Studio response missing courses[] array. ' +
        'Expected: { courses: [...] } or { course: [...] } or [...]'
      );
    }
    
    console.log('[Build Course From Learning Path] Content Studio courses extracted:', contentStudioCourses.length);
    console.log('[Build Course From Learning Path] Learning modules count:', sortedModules.length);
    
    // Build mapping: module_order → module DB record
    const moduleOrderToModule = new Map();
    for (const moduleData of modules) {
      moduleOrderToModule.set(moduleData.module_order, moduleData);
    }
    
    let totalLessons = 0;
    
    // Iterate by module index (i) to enforce index-based mapping
    for (let moduleIndex = 0; moduleIndex < sortedModules.length; moduleIndex++) {
      const learningModule = sortedModules[moduleIndex];
      const contentStudioCourse = contentStudioCourses[moduleIndex];
      
      // Content Studio "topics" array = lessons for this module
      const contentStudioTopics = Array.isArray(contentStudioCourse.topics) 
        ? contentStudioCourse.topics 
        : (contentStudioCourse.topic ? [contentStudioCourse.topic] : []);
      
      // Validate: courses[i].topics.length === learning_modules[i].steps.length
      if (contentStudioTopics.length !== learningModule.steps.length) {
        throw new Error(
          `[Build Course From Learning Path] Index mapping violation for module ${moduleIndex}: ` +
          `learning_modules[${moduleIndex}].steps.length (${learningModule.steps.length}) !== ` +
          `courses[${moduleIndex}].topics.length (${contentStudioTopics.length}). ` +
          `Each step[s] MUST map to topics[s].`
        );
      }
      
      // Get the DB module record for this module_order
      const moduleRecord = moduleOrderToModule.get(learningModule.module_order);
      if (!moduleRecord) {
        throw new Error(
          `[Build Course From Learning Path] Internal error: No module record found for module_order ${learningModule.module_order}`
        );
      }
      
      // Create one lesson per Content Studio topic (index-based: step[s] → topics[s])
      for (let stepIndex = 0; stepIndex < contentStudioTopics.length; stepIndex++) {
        const contentStudioTopic = contentStudioTopics[stepIndex];
        
        // Normalize Content Studio data
        const contents = Array.isArray(contentStudioTopic.contents) 
          ? contentStudioTopic.contents 
          : [];
        const devlabExercises = Array.isArray(contentStudioTopic.devlab_exercises)
          ? contentStudioTopic.devlab_exercises
          : (contentStudioTopic.devlab_exercises === "" || !contentStudioTopic.devlab_exercises)
            ? []
            : [contentStudioTopic.devlab_exercises];
        const formatOrder = Array.isArray(contentStudioTopic.format_order) 
          ? contentStudioTopic.format_order 
          : [];
        const skills = Array.isArray(contentStudioTopic.skills) 
          ? contentStudioTopic.skills 
          : (contentStudioTopic.skills ? [contentStudioTopic.skills] : []);
        const trainerIds = contentStudioTopic.trainer_id 
          ? [contentStudioTopic.trainer_id] 
          : [];
        
        await lessonRepository.create({
          module_id: moduleRecord.id,  // Real DB module_id from Step 2
          topic_id: moduleRecord.topic_id,  // Real DB topic_id from Step 2
          lesson_name: contentStudioTopic.topic_name || `Lesson ${stepIndex + 1}`,
          lesson_description: contentStudioTopic.topic_description || null,
          skills: skills,
          trainer_ids: trainerIds,
          content_type: contentStudioTopic.content_type || null,
          content_data: contents,  // Entire contents[] array as-is from Content Studio
          devlab_exercises: devlabExercises,
          format_order: formatOrder
        });
        totalLessons++;
      }
    }
    
    console.log('[Build Course From Learning Path] ✅ Lessons created:', totalLessons);
    console.log('[Build Course From Learning Path] Lesson creation completed for course:', course.id);

    // Step 5: Create registration (AFTER lessons are fully created)
    console.log('[Build Course From Learning Path] Step 5: Creating registration for learner and course...');
    console.log('[Build Course From Learning Path] Registration data:', {
      learner_id: learningPathJson.learner_id,
      learner_name: learningPathJson.learner_name,
      course_id: course.id,
      company_id: learningPathJson.company_id,
      company_name: learningPathJson.company_name
    });
    
    // Registration field mapping (deterministic, no AI / Content Studio logic):
    // - learner_id: from Learner AI payload (required)
    // - learner_name: from Learner AI payload if available, otherwise NULL
    // - course_id: real UUID returned from courses table insert
    // - company_id: from Learner AI payload if available, otherwise NULL
    // - company_name: from Learner AI payload if available, otherwise NULL
    //
    // Status, enrolled_date, and completed_date are NOT provided here:
    // - status uses DB default ('in_progress')
    // - enrolled_date uses DB default (now())
    // - completed_date stays NULL
    await registrationRepository.create({
      learner_id: learningPathJson.learner_id,
      learner_name: learningPathJson.learner_name || null,
      course_id: course.id,
      company_id: learningPathJson.company_id || null,
      company_name: learningPathJson.company_name || null
    });

    console.log('[Build Course From Learning Path] ✅ Course creation + registration completed successfully:', course.id);
    console.log('[Build Course From Learning Path] ========== COURSE CREATION COMPLETE ==========');
    
    return course.id;
  } catch (error) {
    // If it's already a PendingCourseCreationError, re-throw it as-is
    if (error instanceof PendingCourseCreationError) {
      console.error('[Build Course From Learning Path] ⚠️ PendingCourseCreationError:', error.message);
      throw error;
    }
    
    // For other errors, wrap in generic error (these are real failures)
    console.error('[Build Course From Learning Path] ❌ ERROR building course from Learning Path:');
    console.error('[Build Course From Learning Path] Error type:', error.constructor.name);
    console.error('[Build Course From Learning Path] Error message:', error.message);
    console.error('[Build Course From Learning Path] Error stack:', error.stack);
    console.error('[Build Course From Learning Path] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error(`Failed to build course from Learning Path: ${error.message}`);
  }
}

export default {
  buildCourseFromLearningPath
};

