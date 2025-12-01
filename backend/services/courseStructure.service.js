import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { sendToContentStudio } from '../integration/clients/contentStudioClient.js';
import { generateCourseMetadata } from './courseMetadata.service.js';
import { enrichLesson as enrichLessonAI } from './AIEnrichmentService.js';

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

  // Build modules from learningPath, topics map 1:1, lessons from Content Studio simulation
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

    // Insert topics/modules/lessons
    // Hierarchy: Course → Topics → Modules → Lessons
    let totalLessons = 0;

    for (const topic of learningPath) {
      // Step 1: Create topic (belongs to course)
      const topicId = uuidv4();
      await t.none(
        `INSERT INTO topics (id, course_id, topic_name, topic_description)
         VALUES ($1,$2,$3,$4)`,
        [topicId, courseId, topic.topicName, topic.topicDescription || '']
      );

      // Step 2: Create module (belongs to topic)
      const moduleId = uuidv4();
      await t.none(
        `INSERT INTO modules (id, topic_id, module_name, module_description)
         VALUES ($1,$2,$3,$4)`,
        [moduleId, topicId, topic.topicName, topic.topicDescription || '']
      );

      // Fetch lessons from Content Studio via unified integration system
      // Use unified integration client instead of direct gRPC
      const contentStudioResponse = await sendToContentStudio({
        learnerData: {
          learner_id: metadata?.learner_id || null,
          learner_company: metadata?.learner_company || null
        },
        skills: skills || [],
        courseId,
        moduleId,
        topic: {
          topicId,
          topicName: topic.topicName,
          topicDescription: topic.topicDescription,
          topicLanguage: topic.topicLanguage
        }
      });

      // Extract lessons from Content Studio response
      // Content Studio returns topics[] array, each topic becomes a lesson
      const lessons = contentStudioResponse.lessons || contentStudioResponse.topics || [];

      let lessonOrder = 1;
      for (const lesson of lessons) {
        const lessonId = lesson.lessonId || uuidv4();
        const lessonName = lesson.lessonName || lesson.title || `Lesson ${lessonOrder}`;
        const lessonType = lesson.contentType || lesson.type || 'text';
        const lessonOrderIndex = lesson.order || lesson.order_index || lessonOrder;
        const contentRef =
          lesson.contentRef ||
          lesson.content_data?.content_ref ||
          `doc://${lessonName.toLowerCase().replace(/\s+/g, '_')}`;

        const description =
          lesson.description ||
          lesson.lessonDescription ||
          lesson.summary ||
          lesson.content_data?.summary ||
          (typeof lesson.content_data === 'string' ? lesson.content_data : null);

        const enrichmentResult = await enrichLessonAI({
          topicName: topic.topicName,
          lessonName,
          description,
          skills
        });

        // Normalize content_data to array
        const contentDataArray = Array.isArray(lesson.content_data) 
          ? lesson.content_data 
          : (Array.isArray(lesson.contents) 
              ? lesson.contents 
              : (lesson.content_data ? [lesson.content_data] : []));

        // Normalize devlab_exercises to array
        const devlabExercisesArray = Array.isArray(lesson.devlab_exercises) 
          ? lesson.devlab_exercises 
          : (lesson.devlab_exercises === '' || !lesson.devlab_exercises ? [] : [lesson.devlab_exercises]);

        // Normalize skills to array
        const skillsArray = Array.isArray(lesson.skills) 
          ? lesson.skills 
          : (lesson.skills ? [lesson.skills] : []);

        // Normalize trainer_ids to array
        const trainerIdsArray = Array.isArray(lesson.trainer_ids) 
          ? lesson.trainer_ids 
          : (lesson.trainer_ids ? [lesson.trainer_ids] : []);

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
            lessonId,
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
        lessonOrder = lessonOrderIndex + 1;
        totalLessons += 1;
      }
    }

    // Update learning_path_designation with final metadata
    const updatedMetadata = {
      ...learningPathDesignation,
      total_lessons: totalLessons,
      generated_at: now.toISOString(),
      enrichment_provider: 'openai-assets'
    };

    await t.none(
      'UPDATE courses SET learning_path_designation = $2 WHERE id = $1',
      [courseId, JSON.stringify(updatedMetadata)]
    );

    return {
      courseId,
      structureSummary: {
        modules: learningPath.length,
        topics: learningPath.length,
        lessons: totalLessons
      }
    };
  });
};

export const courseStructureService = {
  generateStructure
};


