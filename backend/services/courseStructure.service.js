import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { requestLessonsFromContentStudio } from './contentDelegation.service.js';

export const generateStructure = async (courseInputDTO) => {
  const { learningPath, skills, level, duration, metadata } = courseInputDTO;

  // Build modules from learningPath, topics map 1:1, lessons from Content Studio simulation
  const courseId = uuidv4();
  const now = new Date();

  // Persist within a transaction
  return db.tx(async (t) => {
    // Insert course as draft/private
    await t.none(
      `INSERT INTO courses (
        course_id, course_name, course_description, level, visibility, status,
        duration, metadata, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [
        courseId,
        `Generated Course ${now.toISOString()}`,
        'Auto-generated from learning path and skills',
        level || null,
        'private',
        'draft',
        duration || null,
        JSON.stringify({ ...metadata, skills })
      ]
    );

    // Create initial version
    await t.none(
      `INSERT INTO versions (version_id, course_id, version_no, status, created_at)
       VALUES (uuid_generate_v4(), $1, 1, 'draft', NOW())`,
      [courseId]
    );

    // Insert modules/topics/lessons
    let moduleOrder = 1;
    let totalLessons = 0;

    for (const topic of learningPath) {
      const moduleId = uuidv4();
      await t.none(
        `INSERT INTO modules (module_id, course_id, name, "order", metadata)
         VALUES ($1,$2,$3,$4,'{}'::jsonb)`,
        [moduleId, courseId, topic.topicName, moduleOrder]
      );

      // Each topic becomes one topic row under the module
      const topicId = uuidv4();
      await t.none(
        `INSERT INTO topics (topic_id, module_id, topic_name, topic_description, content_ref, topic_language)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [topicId, moduleId, topic.topicName, topic.topicDescription || '', null, topic.topicLanguage || 'English']
      );

      // Fetch lessons from Content Studio (gRPC) with graceful fallback
      const { lessons } = await requestLessonsFromContentStudio({
        courseId,
        moduleId,
        topic: {
          topicId,
          topicName: topic.topicName,
          topicDescription: topic.topicDescription,
          topicLanguage: topic.topicLanguage
        },
        skills,
        learnerContext: {
          learnerId: metadata?.learner_id || null,
          metadata
        }
      });

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

        await t.none(
          `INSERT INTO lessons (lesson_id, module_id, topic_id, lesson_name, content_type, content_data, "order")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            lessonId,
            moduleId,
            topicId,
            lessonName,
            lessonType,
            JSON.stringify(
              lesson.content_data || {
                content_ref: contentRef,
                source: lesson.source || 'content-studio'
              }
            ),
            lessonOrderIndex
          ]
        );
        lessonOrder = lessonOrderIndex + 1;
        totalLessons += 1;
      }

      moduleOrder += 1;
    }

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


