import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { requestLessonsFromContentStudio } from './contentDelegation.service.js';
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
    // Insert course as draft/private
    await t.none(
      `INSERT INTO courses (
        course_id, course_name, course_description, level, visibility, status,
        duration, metadata, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [
        courseId,
        courseName,
        courseDescription,
        level || null,
        'private',
        'draft',
        duration || null,
        JSON.stringify({ ...courseMetadata, ...(metadata || {}) })
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

        await t.none(
          `INSERT INTO lessons (
            lesson_id,
            module_id,
            topic_id,
            lesson_name,
            content_type,
            content_data,
            enrichment_data,
            enriched_content,
            "order"
          )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
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
            JSON.stringify(lesson.enrichment_data || {}),
            JSON.stringify(enrichmentResult),
            lessonOrderIndex
          ]
        );
        lessonOrder = lessonOrderIndex + 1;
        totalLessons += 1;
      }

      moduleOrder += 1;
    }

    const updatedMetadata = {
      ...courseMetadata,
      total_lessons: totalLessons,
      generated_at: now.toISOString(),
      enrichment_provider: 'gemini-assets'
    };

    await t.none(
      'UPDATE courses SET metadata = $2 WHERE course_id = $1',
      [courseId, JSON.stringify({ ...updatedMetadata, ...(metadata || {}) })]
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


