import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { sendToContentStudio } from '../integration/clients/contentStudioClient.js';
import { generateCourseMetadata } from './courseMetadata.service.js';
import { enrichLesson as enrichLessonAI } from './AIEnrichmentService.js';
import { generateAIStructure } from './AIStructureGenerator.js';

export const generateStructure = async (courseInputDTO) => {
  const {
    learnerId,
    learnerName,
    learnerCompany,
    learningPath,
    skills,
    level,
    duration,
    metadata
  } = courseInputDTO;

  // Build structure: Fetch lessons from Content Studio, use AI to organize into topics/modules
  const courseId = uuidv4();
  const now = new Date();

  const {
    courseName,
    courseDescription,
    metadata: courseMetadata
  } = generateCourseMetadata({
    learnerId,
    learnerName,
    learnerCompany,
    learningPath,
    skills,
    level,
    duration
  });

  // Persist within a transaction
  return db.tx(async (t) => {
    // Determine course type: 'learner_specific' if learnerId exists, otherwise 'trainer'
    const courseType = learnerId ? 'learner_specific' : 'trainer';
    
    // Store metadata in learning_path_designation JSONB field
    const learningPathDesignation = {
      ...courseMetadata,
      ...(metadata || {})
    };

    // Insert course as draft
    await t.none(
      `INSERT INTO courses (
        id, course_name, course_description, course_type, status, level,
        duration_hours, created_by_user_id, learning_path_designation,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [
        courseId,
        courseName,
        courseDescription,
        courseType,
        'draft',
        level || null,
        duration || null,
        learnerId || null, // Set created_by_user_id to learnerId for personalized courses
        JSON.stringify(learningPathDesignation)
      ]
    );

    // Auto-create registration for personalized courses
    if (learnerId) {
      // Create registration record
      await t.none(
        `INSERT INTO registrations (
          id, learner_id, learner_name, course_id, company_name, status, enrolled_date
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'in_progress', NOW())`,
        [
          learnerId,
          learnerName || null,
          courseId,
          learnerCompany || null
        ]
      );

      // Update studentsIDDictionary to include the learner
      const studentsDict = {
        [learnerId]: {
          status: 'in_progress',
          enrolled_date: now.toISOString(),
          completed_date: null,
          completion_reason: null
        }
      };
      await t.none(
        `UPDATE courses SET studentsIDDictionary = $2 WHERE id = $1`,
        [courseId, JSON.stringify(studentsDict)]
      );
    }

    // Create initial version
    await t.none(
      `INSERT INTO versions (id, entity_type, entity_id, version_number, data, created_at)
       VALUES (uuid_generate_v4(), 'course', $1, 1, '{}'::jsonb, NOW())`,
      [courseId]
    );

    // NEW APPROACH: Fetch all lessons first, then use AI to structure them
    // Step 1: Fetch ALL lessons from Content Studio for all topics/skills
    console.log('[Course Structure] Fetching all lessons from Content Studio...');
    const allLessonsFromContentStudio = [];
    const lessonIdMap = new Map(); // Map to store lesson data by ID

    for (const topic of learningPath) {
      try {
        const contentStudioResponse = await sendToContentStudio({
          learnerData: {
            learner_id: metadata?.learner_id || null,
            learner_company: metadata?.learner_company || null
          },
          skills: skills || [],
          courseId,
          moduleId: null, // Not needed for initial fetch
          topic: {
            topicId: null, // Not needed for initial fetch
            topicName: topic.topicName,
            topicDescription: topic.topicDescription,
            topicLanguage: topic.topicLanguage
          }
        });

        // Extract lessons from Content Studio response
        const lessons = contentStudioResponse.lessons || contentStudioResponse.topics || [];
        
        // Process and store lessons with unique IDs
        for (let idx = 0; idx < lessons.length; idx++) {
          const lesson = lessons[idx];
          // Generate stable lesson ID - prefer existing, otherwise use UUID for consistency
          const lessonId = lesson.lessonId || lesson.id || uuidv4();
          const lessonName = lesson.lessonName || lesson.title || lesson.name || `Lesson ${allLessonsFromContentStudio.length + 1}`;
          
          // Store full lesson data for later use
          const lessonDataWithId = {
            ...lesson,
            lessonId: lessonId, // Ensure lessonId is set
            id: lessonId, // Also set id field for compatibility
            lessonName,
            originalTopic: topic.topicName
          };
          
          lessonIdMap.set(lessonId, lessonDataWithId);
          
          allLessonsFromContentStudio.push({
            lessonId,
            lessonName,
            lesson: lessonDataWithId
          });
        }
        
        console.log(`[Course Structure] Fetched ${lessons.length} lessons for topic: ${topic.topicName}`);
      } catch (error) {
        console.error(`[Course Structure] Error fetching lessons for topic ${topic.topicName}:`, error.message);
        // Continue with other topics even if one fails
      }
    }

    console.log(`[Course Structure] Total lessons fetched: ${allLessonsFromContentStudio.length}`);

    // Check if we have any lessons
    if (allLessonsFromContentStudio.length === 0) {
      console.warn('[Course Structure] No lessons fetched from Content Studio, using fallback structure');
      // Use fallback structure based on learning path
      const aiStructureResult = await generateAIStructure({
        learningPath,
        skills,
        allLessons: []
      });
      
      // Continue with structure creation even if no lessons
      const structure = aiStructureResult.structure;
      
      // Create topics/modules from structure (without lessons)
      let totalTopics = 0;
      let totalModules = 0;
      
      for (const topicData of structure.topics || []) {
        const topicId = uuidv4();
        totalTopics += 1;
        await t.none(
          `INSERT INTO topics (id, course_id, topic_name, topic_description)
           VALUES ($1,$2,$3,$4)`,
          [topicId, courseId, topicData.topic_name, topicData.topic_description || '']
        );
        
        for (const moduleData of topicData.modules || []) {
          const moduleId = uuidv4();
          totalModules += 1;
          await t.none(
            `INSERT INTO modules (id, topic_id, module_name, module_description)
             VALUES ($1,$2,$3,$4)`,
            [moduleId, topicId, moduleData.module_name, moduleData.module_description || '']
          );
        }
      }
      
      // Update metadata
      const updatedMetadata = {
        ...learningPathDesignation,
        total_lessons: 0,
        total_topics: totalTopics,
        total_modules: totalModules,
        generated_at: now.toISOString(),
        enrichment_provider: 'openai-assets',
        structure_source: 'fallback',
        structure_generated_by: 'ai'
      };
      
      await t.none(
        'UPDATE courses SET learning_path_designation = $2 WHERE id = $1',
        [courseId, JSON.stringify(updatedMetadata)]
      );
      
      return {
        courseId,
        structureSummary: {
          topics: totalTopics,
          modules: totalModules,
          lessons: 0,
          structureSource: 'fallback'
        }
      };
    }

    // Step 2: Use AI to generate topic/module structure based on lesson content
    console.log('[Course Structure] Generating AI structure from lesson content...');
    const aiStructureResult = await generateAIStructure({
      learningPath,
      skills,
      allLessons: Array.from(lessonIdMap.values())
    });

    const structure = aiStructureResult.structure;
    console.log(`[Course Structure] AI structure generated (source: ${aiStructureResult.source})`);
    console.log(`[Course Structure] Topics: ${structure.topics?.length || 0}`);

    // Step 3: Create topics, modules, and assign lessons based on AI structure
    // Hierarchy: Course → Topics → Modules → Lessons
    let totalLessons = 0;
    let totalTopics = 0;
    let totalModules = 0;

    for (const topicData of structure.topics) {
      // Create topic
      const topicId = uuidv4();
      totalTopics += 1;
      await t.none(
        `INSERT INTO topics (id, course_id, topic_name, topic_description)
         VALUES ($1,$2,$3,$4)`,
        [
          topicId,
          courseId,
          topicData.topic_name,
          topicData.topic_description || ''
        ]
      );

      // Create modules for this topic
      for (const moduleData of topicData.modules) {
        const moduleId = uuidv4();
        totalModules += 1;
        await t.none(
          `INSERT INTO modules (id, topic_id, module_name, module_description)
           VALUES ($1,$2,$3,$4)`,
          [
            moduleId,
            topicId,
            moduleData.module_name,
            moduleData.module_description || ''
          ]
        );

        // Assign lessons to this module
        for (const lessonIdFromAI of moduleData.lesson_ids || []) {
          // Find the lesson in our map
          const lessonData = lessonIdMap.get(lessonIdFromAI);
          
          if (!lessonData) {
            console.warn(`[Course Structure] Lesson ID ${lessonIdFromAI} not found in lesson map, skipping`);
            continue;
          }

          // Use the lesson ID from the map (already set when fetching from Content Studio)
          const dbLessonId = lessonData.lessonId;
          
          const lessonName = lessonData.lessonName || lessonData.title || lessonData.name || `Lesson ${totalLessons + 1}`;
          const lessonType = lessonData.contentType || lessonData.type || 'text';
          const lessonOrderIndex = lessonData.order || lessonData.order_index || totalLessons + 1;

          const description =
            lessonData.description ||
            lessonData.lessonDescription ||
            lessonData.summary ||
            lessonData.content_data?.summary ||
            (typeof lessonData.content_data === 'string' ? lessonData.content_data : null);

          // Apply enrichment (optional, can be async)
          try {
            await enrichLessonAI({
              topicName: topicData.topic_name,
              lessonName,
              description,
              skills
            });
          } catch (enrichError) {
            console.warn(`[Course Structure] Enrichment failed for lesson ${lessonName}:`, enrichError.message);
            // Continue without enrichment
          }

          // Normalize content_data to array
          const contentDataArray = Array.isArray(lessonData.content_data)
            ? lessonData.content_data
            : (Array.isArray(lessonData.contents)
                ? lessonData.contents
                : (lessonData.content_data ? [lessonData.content_data] : []));

          // Normalize devlab_exercises to array
          const devlabExercisesArray = Array.isArray(lessonData.devlab_exercises)
            ? lessonData.devlab_exercises
            : (lessonData.devlab_exercises === '' || !lessonData.devlab_exercises ? [] : [lessonData.devlab_exercises]);

          // Normalize skills to array
          const skillsArray = Array.isArray(lessonData.skills)
            ? lessonData.skills
            : (lessonData.skills ? [lessonData.skills] : []);

          // Normalize trainer_ids to array
          const trainerIdsArray = Array.isArray(lessonData.trainer_ids)
            ? lessonData.trainer_ids
            : (lessonData.trainer_ids ? [lessonData.trainer_ids] : []);

          // Insert lesson
          await t.none(
            `INSERT INTO lessons (
              id,
              module_id,
              topic_id,
              lesson_name,
              lesson_description,
              content_type,
              content_data,
              devlab_exercises,
              skills,
              trainer_ids
            )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              dbLessonId,
              moduleId,
              topicId,
              lessonName,
              description || null,
              lessonType || null,
              JSON.stringify(contentDataArray),
              JSON.stringify(devlabExercisesArray),
              JSON.stringify(skillsArray),
              trainerIdsArray
            ]
          );
          
          totalLessons += 1;
        }
      }
    }

    // Update learning_path_designation with final metadata
    const updatedMetadata = {
      ...learningPathDesignation,
      total_lessons: totalLessons,
      total_topics: totalTopics,
      total_modules: totalModules,
      generated_at: now.toISOString(),
      enrichment_provider: 'openai-assets',
      structure_source: aiStructureResult.source || 'fallback',
      structure_generated_by: 'ai' // Indicates AI-generated topic/module names
    };

    await t.none(
      'UPDATE courses SET learning_path_designation = $2 WHERE id = $1',
      [courseId, JSON.stringify(updatedMetadata)]
    );

    return {
      courseId,
      structureSummary: {
        topics: totalTopics,
        modules: totalModules,
        lessons: totalLessons,
        structureSource: aiStructureResult.source
      }
    };
  });
};

export const courseStructureService = {
  generateStructure
};


