/**
 * Isolated transactional persistence for Trainer Publish FINALIZE.
 * Does NOT call the legacy non-transactional ContentStudio handler.
 */

import db from '../../config/database.js';
import courseRepository from '../../repositories/CourseRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import {
  buildPersistableCourseSnapshot,
  persistableContentMatches
} from './contentFingerprint.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from '../../utils/trainerPublishErrors.js';

function httpError(status, errorCode, message) {
  return trainerPublishError(status, errorCode, message);
}

function isUniqueViolation(err) {
  return err?.code === '23505';
}

/**
 * Load persisted lessons including format_order via raw SQL
 * (Lesson.fromRow omits format_order).
 *
 * @param {string} courseId
 * @param {Object} [dbCtx=db]
 * @returns {Promise<Object[]>}
 */
export async function loadPersistedLessonsWithFormatOrder(courseId, dbCtx = db) {
  const rows = await dbCtx.any(
    `SELECT
       l.lesson_name,
       l.lesson_description,
       l.content_type,
       l.content_data,
       l.devlab_exercises,
       l.skills,
       l.trainer_ids,
       l.format_order
     FROM lessons l
     INNER JOIN modules m ON m.id = l.module_id
     INNER JOIN topics t ON t.id = m.topic_id
     WHERE t.course_id = $1
     ORDER BY l.lesson_name`,
    [courseId]
  );

  return rows.map((row) => ({
    lesson_name: row.lesson_name,
    lesson_description: row.lesson_description,
    content_type: row.content_type,
    content_data: Array.isArray(row.content_data)
      ? row.content_data
      : row.content_data
        ? [row.content_data]
        : [],
    devlab_exercises: Array.isArray(row.devlab_exercises)
      ? row.devlab_exercises
      : row.devlab_exercises
        ? [row.devlab_exercises]
        : [],
    skills: Array.isArray(row.skills) ? row.skills : row.skills ? [row.skills] : [],
    trainer_ids: Array.isArray(row.trainer_ids) ? row.trainer_ids : [],
    format_order: Array.isArray(row.format_order) ? row.format_order : []
  }));
}

/**
 * Build snapshot from an existing DB course for idempotency comparison.
 * @param {Object} course - Course model/row
 * @param {Object} [dbCtx=db]
 */
export async function buildPersistedSnapshot(course, dbCtx = db) {
  const lessons = await loadPersistedLessonsWithFormatOrder(course.id, dbCtx);
  return buildPersistableCourseSnapshot({
    course_name: course.course_name,
    course_description: course.course_description,
    created_by_user_id: course.created_by_user_id,
    lessons
  });
}

/**
 * Insert course + topic + module + lessons atomically.
 * @param {Object} params
 * @param {Object} params.t - pg-promise transaction context
 * @param {string} params.courseId
 * @param {Object} params.normalized
 * @param {string} params.createdByUserId
 * @param {Object} [params.repos] - injectable repositories for tests
 * @returns {Promise<{ lessons_created: number }>}
 */
export async function insertTrainerCourseInTransaction({
  t,
  courseId,
  normalized,
  createdByUserId,
  repos = {}
}) {
  const courses = repos.courseRepository || courseRepository;
  const topics = repos.topicRepository || topicRepository;
  const modules = repos.moduleRepository || moduleRepository;
  const lessons = repos.lessonRepository || lessonRepository;

  // status active only after full structure is written — visibility is post-commit.
  await courses.create(
    {
      id: courseId,
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      course_type: 'trainer',
      status: 'active',
      created_by_user_id: createdByUserId
    },
    t
  );

  const topic = await topics.create(
    {
      course_id: courseId,
      topic_name: normalized.course_name || 'Topic 1',
      topic_description: normalized.course_description || null
    },
    t
  );

  const module = await modules.create(
    {
      topic_id: topic.id,
      module_name: 'Module 1',
      module_description: null
    },
    t
  );

  let lessonsCreated = 0;
  for (let i = 0; i < normalized.lessons.length; i++) {
    const lessonData = normalized.lessons[i];
    await lessons.create(
      {
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
      },
      t
    );
    lessonsCreated += 1;
  }

  return { lessons_created: lessonsCreated };
}

/**
 * Idempotent publish: create if absent; if present, verify content match (never overwrite).
 *
 * @param {Object} params
 * @param {string} params.courseId - deterministic UUID v5
 * @param {Object} params.normalized - normalizeContentStudioPayload result
 * @param {string} params.createdByUserId
 * @param {Object} params.incomingSnapshot - persistable snapshot used for fingerprint
 * @param {Object} [params.deps]
 * @returns {Promise<{
 *   course_id: string,
 *   lessons_created: number,
 *   lessons_expected: number,
 *   idempotent: boolean
 * }>}
 */
export async function publishTrainerCourseIdempotent({
  courseId,
  normalized,
  createdByUserId,
  incomingSnapshot,
  deps = {}
}) {
  const database = deps.db || db;
  const courses = deps.courseRepository || courseRepository;
  const loadSnapshot = deps.buildPersistedSnapshot || buildPersistedSnapshot;
  const insertTx = deps.insertTrainerCourseInTransaction || insertTrainerCourseInTransaction;
  const lessonsExpected = normalized.lessons.length;

  const existing = await courses.findById(courseId);
  if (existing) {
    const persisted = await loadSnapshot(existing);
    if (!persistableContentMatches(incomingSnapshot, persisted)) {
      throw httpError(
        409,
        TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
        'Trainer Publish FINALIZE conflict: course identity already exists with different content'
      );
    }
    const lessonCount = (persisted.lessons || []).length;
    return {
      course_id: courseId,
      lessons_created: lessonCount,
      lessons_expected: lessonsExpected,
      idempotent: true
    };
  }

  try {
    const result = await database.tx(async (t) => {
      // Re-check inside transaction to shrink race window.
      const inside = await courses.findById(courseId, t);
      if (inside) {
        const persisted = await loadSnapshot(inside, t);
        if (!persistableContentMatches(incomingSnapshot, persisted)) {
          throw httpError(
            409,
            TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
            'Trainer Publish FINALIZE conflict: course identity already exists with different content'
          );
        }
        return {
          course_id: courseId,
          lessons_created: (persisted.lessons || []).length,
          lessons_expected: lessonsExpected,
          idempotent: true
        };
      }

      const inserted = await insertTx({
        t,
        courseId,
        normalized,
        createdByUserId,
        repos: deps
      });

      return {
        course_id: courseId,
        lessons_created: inserted.lessons_created,
        lessons_expected: lessonsExpected,
        idempotent: false
      };
    });
    return result;
  } catch (err) {
    if (err.status) throw err;

    // Concurrent FINALIZE: loser hits PK conflict → reload + content verify.
    if (isUniqueViolation(err)) {
      const again = await courses.findById(courseId);
      if (!again) {
        throw httpError(
          409,
          TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
          'Trainer Publish FINALIZE concurrent conflict could not be resolved'
        );
      }
      const persisted = await loadSnapshot(again);
      if (!persistableContentMatches(incomingSnapshot, persisted)) {
        throw httpError(
          409,
          TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
          'Trainer Publish FINALIZE conflict: course identity already exists with different content'
        );
      }
      return {
        course_id: courseId,
        lessons_created: (persisted.lessons || []).length,
        lessons_expected: lessonsExpected,
        idempotent: true
      };
    }
    throw err;
  }
}

export default {
  loadPersistedLessonsWithFormatOrder,
  buildPersistedSnapshot,
  insertTrainerCourseInTransaction,
  publishTrainerCourseIdempotent
};
