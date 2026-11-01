/**
 * Opt-in Trainer Publish lesson display order (Chunked FINALIZE + Course Details only).
 * Stored at learning_path_designation.trainer_publish_lesson_order.
 * Does not change LessonRepository ORDER BY lesson_name.
 */

export const TRAINER_PUBLISH_LESSON_ORDER_KEY = 'trainer_publish_lesson_order';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a stored order array against the exact set of lesson IDs for a course.
 * @param {unknown} rawOrder
 * @param {string[]} courseLessonIds
 * @returns {string[]|null} normalized order, or null if unsafe
 */
export function validateTrainerPublishLessonOrder(rawOrder, courseLessonIds) {
  if (!Array.isArray(rawOrder)) {
    return null;
  }
  if (!Array.isArray(courseLessonIds)) {
    return null;
  }

  const expected = courseLessonIds.map((id) => String(id));
  if (rawOrder.length !== expected.length) {
    return null;
  }

  const expectedSet = new Set(expected);
  if (expectedSet.size !== expected.length) {
    return null; // duplicate lesson ids in course — refuse custom order
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of rawOrder) {
    if (typeof entry !== 'string' || !UUID_RE.test(entry)) {
      return null;
    }
    const id = entry.toLowerCase();
    // Preserve canonical casing from course ids when possible
    if (seen.has(id)) {
      return null;
    }
    seen.add(id);
    if (![...expectedSet].some((e) => e.toLowerCase() === id)) {
      return null;
    }
    const match = expected.find((e) => e.toLowerCase() === id);
    normalized.push(match);
  }

  if (seen.size !== expectedSet.size) {
    return null;
  }
  for (const e of expectedSet) {
    if (!seen.has(e.toLowerCase())) {
      return null;
    }
  }

  return normalized;
}

/**
 * Reorder a flat lesson list (same parent module) using a validated course-wide order.
 * Lessons not moving between parents — only relative order within the list.
 *
 * @param {Array<{ id?: string, lesson_id?: string }>} lessons
 * @param {string[]} validatedCourseOrder
 * @returns {Array|null} reordered lessons, or null if cannot apply safely
 */
export function reorderLessonsWithinContainer(lessons, validatedCourseOrder) {
  if (!Array.isArray(lessons) || !Array.isArray(validatedCourseOrder)) {
    return null;
  }
  if (lessons.length === 0) {
    return lessons;
  }

  const byId = new Map();
  for (const lesson of lessons) {
    const id = lesson.id || lesson.lesson_id;
    if (!id || byId.has(id)) {
      return null;
    }
    byId.set(id, lesson);
  }

  const filtered = validatedCourseOrder.filter((id) => byId.has(id));
  if (filtered.length !== lessons.length) {
    return null;
  }

  return filtered.map((id) => byId.get(id));
}

/**
 * Apply trainer_publish_lesson_order to a topics→modules→lessons tree (Course Details shape).
 * On any validation failure returns the original tree unchanged and applied=false.
 *
 * @param {Array} topicsData
 * @param {Object|null|undefined} learningPathDesignation
 * @returns {{ topicsData: Array, applied: boolean, reason?: string }}
 */
export function applyTrainerPublishLessonOrderToTopicsTree(
  topicsData,
  learningPathDesignation
) {
  const rawOrder =
    learningPathDesignation &&
    learningPathDesignation[TRAINER_PUBLISH_LESSON_ORDER_KEY];

  if (rawOrder === undefined || rawOrder === null) {
    return { topicsData, applied: false, reason: 'missing' };
  }

  const allLessons = [];
  for (const topic of topicsData || []) {
    for (const mod of topic.modules || []) {
      for (const lesson of mod.lessons || []) {
        allLessons.push(lesson);
      }
    }
  }

  const allIds = allLessons.map((l) => l.id || l.lesson_id).filter(Boolean);
  const validated = validateTrainerPublishLessonOrder(rawOrder, allIds);
  if (!validated) {
    return { topicsData, applied: false, reason: 'invalid' };
  }

  const nextTopics = (topicsData || []).map((topic) => ({
    ...topic,
    modules: (topic.modules || []).map((mod) => {
      const reordered = reorderLessonsWithinContainer(mod.lessons || [], validated);
      if (!reordered) {
        return null;
      }
      return { ...mod, lessons: reordered };
    })
  }));

  if (nextTopics.some((t) => (t.modules || []).some((m) => m === null))) {
    return { topicsData, applied: false, reason: 'container_mismatch' };
  }

  return { topicsData: nextTopics, applied: true };
}

/**
 * Merge trainer_publish_lesson_order into an existing LPD object (shallow merge of key only).
 * @param {Object} existingLpd
 * @param {string[]} lessonIdsInOrder
 * @returns {Object}
 */
export function mergeTrainerPublishLessonOrder(existingLpd, lessonIdsInOrder) {
  const base =
    existingLpd && typeof existingLpd === 'object' && !Array.isArray(existingLpd)
      ? { ...existingLpd }
      : {};
  base[TRAINER_PUBLISH_LESSON_ORDER_KEY] = [...lessonIdsInOrder];
  return base;
}

export default {
  TRAINER_PUBLISH_LESSON_ORDER_KEY,
  validateTrainerPublishLessonOrder,
  reorderLessonsWithinContainer,
  applyTrainerPublishLessonOrderToTopicsTree,
  mergeTrainerPublishLessonOrder
};
