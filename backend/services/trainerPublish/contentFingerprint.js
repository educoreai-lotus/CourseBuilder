/**
 * Canonical persistable content fingerprint for Trainer Publish FINALIZE.
 * Based on Course Builder normalized lesson fields — not GZIP transport bytes.
 */

import crypto from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';

/**
 * Fixed app namespace for deterministic published course IDs (UUID v5).
 * Distinct from TRAINER_PUBLISH_TRANSFER_NAMESPACE.
 */
export const TRAINER_PUBLISH_COURSE_NAMESPACE =
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Deep-canonicalize for stable JSON: sort object keys; preserve array order.
 * @param {unknown} value
 * @returns {unknown}
 */
export function deepCanonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepCanonicalize(item));
  }
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = deepCanonicalize(value[key]);
  }
  return out;
}

function normalizeUuidList(ids) {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim().toLowerCase());
}

/**
 * Persistable lesson snapshot (no DB ids).
 * @param {Object} lesson
 * @returns {Object}
 */
export function buildPersistableLesson(lesson) {
  return {
    lesson_name: lesson.lesson_name || '',
    lesson_description:
      lesson.lesson_description === undefined || lesson.lesson_description === null
        ? null
        : lesson.lesson_description,
    content_type: lesson.content_type || 'mixed',
    content_data: Array.isArray(lesson.content_data) ? lesson.content_data : [],
    devlab_exercises: Array.isArray(lesson.devlab_exercises)
      ? lesson.devlab_exercises
      : [],
    skills: Array.isArray(lesson.skills) ? lesson.skills : [],
    trainer_ids: normalizeUuidList(lesson.trainer_ids),
    format_order: Array.isArray(lesson.format_order) ? lesson.format_order : []
  };
}

/**
 * Persistable course snapshot used for content_fingerprint.
 * Lesson array order follows normalized incoming topics[] order.
 *
 * @param {{
 *   course_name: string,
 *   course_description?: string|null,
 *   created_by_user_id: string|null,
 *   lessons: Object[]
 * }} params
 * @returns {Object}
 */
export function buildPersistableCourseSnapshot({
  course_name,
  course_description = null,
  created_by_user_id,
  lessons
}) {
  return {
    course_name: course_name || '',
    course_description:
      course_description === undefined || course_description === null
        ? null
        : course_description,
    created_by_user_id: created_by_user_id
      ? String(created_by_user_id).toLowerCase()
      : null,
    lessons: (lessons || []).map(buildPersistableLesson)
  };
}

/**
 * @param {Object} snapshot - persistable course snapshot
 * @returns {string} lowercase hex SHA-256
 */
export function computeContentFingerprint(snapshot) {
  const canonical = deepCanonicalize(snapshot);
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex');
}

/**
 * Per-lesson fingerprint for order-independent multiset comparison.
 * @param {Object} lesson
 * @returns {string}
 */
export function computeLessonFingerprint(lesson) {
  const canonical = deepCanonicalize(buildPersistableLesson(lesson));
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex');
}

/**
 * Compare incoming normalized content vs DB-loaded content.
 * Course metadata must match; lessons compared as order-independent multiset
 * of per-lesson fingerprints (array order within each lesson is preserved).
 *
 * @param {Object} incomingSnapshot
 * @param {Object} persistedSnapshot
 * @returns {boolean}
 */
export function persistableContentMatches(incomingSnapshot, persistedSnapshot) {
  if (!incomingSnapshot || !persistedSnapshot) return false;

  if (
    String(incomingSnapshot.course_name || '') !==
    String(persistedSnapshot.course_name || '')
  ) {
    return false;
  }
  const inDesc =
    incomingSnapshot.course_description === undefined ||
    incomingSnapshot.course_description === null
      ? null
      : String(incomingSnapshot.course_description);
  const dbDesc =
    persistedSnapshot.course_description === undefined ||
    persistedSnapshot.course_description === null
      ? null
      : String(persistedSnapshot.course_description);
  if (inDesc !== dbDesc) return false;

  const inTrainer = incomingSnapshot.created_by_user_id
    ? String(incomingSnapshot.created_by_user_id).toLowerCase()
    : null;
  const dbTrainer = persistedSnapshot.created_by_user_id
    ? String(persistedSnapshot.created_by_user_id).toLowerCase()
    : null;
  if (inTrainer !== dbTrainer) return false;

  const inLessons = incomingSnapshot.lessons || [];
  const dbLessons = persistedSnapshot.lessons || [];
  if (inLessons.length !== dbLessons.length) return false;

  const inHashes = inLessons.map(computeLessonFingerprint).sort();
  const dbHashes = dbLessons.map(computeLessonFingerprint).sort();
  for (let i = 0; i < inHashes.length; i++) {
    if (inHashes[i] !== dbHashes[i]) return false;
  }
  return true;
}

/**
 * Deterministic published course UUID.
 * Name: content-studio|publisher_trainer_id|source_course_id|content_fingerprint
 *
 * @param {{
 *   publisher_trainer_id: string,
 *   source_course_id: string,
 *   content_fingerprint: string
 * }} params
 * @returns {string}
 */
export function generateDeterministicCourseId({
  publisher_trainer_id,
  source_course_id,
  content_fingerprint
}) {
  const name = [
    'content-studio',
    String(publisher_trainer_id).toLowerCase(),
    String(source_course_id),
    String(content_fingerprint).toLowerCase()
  ].join('|');
  return uuidv5(name, TRAINER_PUBLISH_COURSE_NAMESPACE);
}

export default {
  TRAINER_PUBLISH_COURSE_NAMESPACE,
  deepCanonicalize,
  buildPersistableLesson,
  buildPersistableCourseSnapshot,
  computeContentFingerprint,
  computeLessonFingerprint,
  persistableContentMatches,
  generateDeterministicCourseId
};
