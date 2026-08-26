/**
 * Finalization: validate CS RESULT in memory, then atomically replace lessons
 * and mark the overall job completed in one fenced transaction.
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';
import { normalizeLessonData } from '../contentStudioNormalizer.js';
import {
  extractSinglePathTopics,
  sliceTopicsByModuleSteps
} from '../../utils/personalizedLessonPlacement.js';
import courseRepository from '../../repositories/CourseRepository.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import personalizedGenerationJobRepository from '../../repositories/PersonalizedGenerationJobRepository.js';
import db from '../../config/database.js';
import {
  PERSONALIZED_JOB_STAGES,
  PERSONALIZED_JOB_STATUSES
} from '../../utils/personalizedAsyncGeneration.js';

/**
 * Build complete expected lesson rows in memory. Throws on invalid RESULT.
 * Does not mutate lessons.
 */
export async function buildValidatedLessonSetInMemory({
  contentStudioResult,
  requestPayload,
  courseId
}) {
  const data = learnerAIDTO.buildFromReceived(requestPayload);
  const rawLearningModules = Array.isArray(data.learning_path?.learning_modules)
    ? data.learning_path.learning_modules
    : null;

  if (!rawLearningModules || rawLearningModules.length === 0) {
    const error = new Error(
      'Personalized course build failed: learning_path.learning_modules is missing or empty'
    );
    error.status = 400;
    throw error;
  }

  const course = await courseRepository.findById(courseId);
  if (!course) {
    const error = new Error('Personalized finalization failed: course not found');
    error.status = 500;
    throw error;
  }

  const placement = course.learning_path_designation?.async_module_placement;
  if (!Array.isArray(placement) || placement.length === 0) {
    const error = new Error(
      'Personalized finalization failed: async_module_placement missing on course'
    );
    error.status = 500;
    throw error;
  }

  const createdModulesByOriginalIndex = [];
  for (const entry of placement) {
    if (
      typeof entry.original_index !== 'number' ||
      !entry.module_id ||
      !entry.topic_id
    ) {
      const error = new Error(
        'Personalized finalization failed: invalid async_module_placement entry'
      );
      error.status = 500;
      throw error;
    }
    createdModulesByOriginalIndex[entry.original_index] = {
      id: entry.module_id,
      topic_id: entry.topic_id
    };
  }

  if (
    createdModulesByOriginalIndex.length !== rawLearningModules.length ||
    createdModulesByOriginalIndex.some((cbModule) => !cbModule)
  ) {
    const error = new Error(
      `Personalized course build failed: created module count does not match learning_modules (${rawLearningModules.length})`
    );
    error.status = 500;
    throw error;
  }

  const topicsToProcess = extractSinglePathTopics(contentStudioResult);
  const moduleSlices = sliceTopicsByModuleSteps(
    topicsToProcess,
    rawLearningModules
  );

  const lessonRows = [];
  for (let i = 0; i < moduleSlices.length; i++) {
    const cbModule = createdModulesByOriginalIndex[i];
    const slice = moduleSlices[i];
    for (const topic of slice.topics) {
      const lessonData = normalizeLessonData(topic);
      lessonRows.push({
        module_id: cbModule.id,
        topic_id: cbModule.topic_id,
        lesson_name: lessonData.lesson_name,
        lesson_description: lessonData.lesson_description,
        skills: lessonData.skills,
        trainer_ids: lessonData.trainer_ids,
        content_type: lessonData.content_type,
        content_data: lessonData.content_data,
        devlab_exercises: lessonData.devlab_exercises,
        format_order: lessonData.format_order
      });
    }
  }

  return { lessonRows, courseId };
}

/**
 * Fenced finalization: delete lessons for job.course_id only, insert full set,
 * mark job completed — all in one transaction after fence.
 */
export async function finalizeLessonsInFencedTransaction({
  jobId,
  expectedAttemptCount,
  courseId,
  lessonRows
}) {
  return db.tx(async (t) => {
    const locked = await personalizedGenerationJobRepository.lockForFence(
      t,
      jobId,
      expectedAttemptCount,
      {
        stage: PERSONALIZED_JOB_STAGES.FINALIZING_COURSE,
        courseId
      }
    );

    if (!locked) {
      return { ownershipLost: true, completed: false };
    }

    await lessonRepository.deleteByCourseId(courseId, t);

    for (const row of lessonRows) {
      await lessonRepository.create(row, t);
    }

    const completed = await t.oneOrNone(
      `UPDATE personalized_generation_jobs
       SET status = $2,
           stage = $3,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           error_message = NULL
       WHERE id = $1
         AND status = 'processing'
         AND attempt_count = $4
         AND stage = $5
         AND course_id = $6
         AND lease_expires_at > CURRENT_TIMESTAMP
       RETURNING *`,
      [
        jobId,
        PERSONALIZED_JOB_STATUSES.COMPLETED,
        PERSONALIZED_JOB_STAGES.DONE,
        expectedAttemptCount,
        PERSONALIZED_JOB_STAGES.FINALIZING_COURSE,
        courseId
      ]
    );

    if (!completed) {
      throw new Error('Finalization job completion update failed (fence lost)');
    }

    return { ownershipLost: false, completed: true };
  });
}

export default {
  buildValidatedLessonSetInMemory,
  finalizeLessonsInFencedTransaction
};
