import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Simulate Content Studio response for a given skill list
function simulateContentStudioLessons(skills) {
  // Build a simple deterministic set of lessons per skill
  return skills.map((skill, index) => ({
    lesson_name: `${skill} Basics`,
    content_type: 'text',
    content_data: { content_ref: `doc://${skill.toLowerCase()}_basics` },
    order_index: index + 1
  }));
}

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
        `INSERT INTO modules (module_id, course_id, module_name, order_index, metadata)
         VALUES ($1,$2,$3,$4,'{}')`,
        [moduleId, courseId, topic.topicName, moduleOrder]
      );

      // Each topic becomes one topic row under the module
      const topicId = uuidv4();
      await t.none(
        `INSERT INTO topics (topic_id, module_id, topic_name, topic_description, topic_language, order_index)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [topicId, moduleId, topic.topicName, topic.topicDescription || '', topic.topicLanguage || 'English', 1]
      );

      // Simulate lessons from Content Studio
      const lessons = simulateContentStudioLessons(skills);
      let lessonOrder = 1;
      for (const lesson of lessons) {
        await t.none(
          `INSERT INTO lessons (lesson_id, topic_id, lesson_name, content_type, content_data, order_index)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuidv4(), topicId, lesson.lesson_name, lesson.content_type, JSON.stringify(lesson.content_data), lessonOrder]
        );
        lessonOrder += 1;
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


