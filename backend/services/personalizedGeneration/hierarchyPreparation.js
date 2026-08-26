/**
 * Hierarchy preparation for async personalized generation.
 * AI structure generation runs OUTSIDE any DB transaction.
 * Course/topics/modules + job.course_id commit atomically in one short tx.
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';
import aiStructureGenerator from '../AIStructureGenerator.js';
import courseRepository from '../../repositories/CourseRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import versionRepository from '../../repositories/VersionRepository.js';
import personalizedGenerationJobRepository from '../../repositories/PersonalizedGenerationJobRepository.js';
import db from '../../config/database.js';
import { PERSONALIZED_JOB_STAGES } from '../../utils/personalizedAsyncGeneration.js';

/**
 * Build the same in-memory hierarchy plan used by the sync handler,
 * including AI structure generation (outside DB tx).
 */
export async function buildHierarchyPlanOutsideTx(requestPayload) {
  const data = learnerAIDTO.buildFromReceived(requestPayload);

  if (!data.learning_path) {
    const error = new Error('Personalized generation requires learning_path');
    error.status = 400;
    throw error;
  }

  if (!data.user_id || !data.competency_name) {
    const error = new Error(
      'Personalized generation requires user_id and competency_target_name'
    );
    error.status = 400;
    throw error;
  }

  const courseName =
    data.competency_name || data.learning_path.path_title || 'Personalized Course';

  const courseSpec = {
    course_name: courseName,
    course_description: `Personalized learning path: ${data.learning_path.path_title || courseName}`,
    course_type: 'learner_specific',
    status: 'active',
    level: null,
    duration_hours: data.learning_path.total_estimated_duration_hours || null,
    created_by_user_id: data.user_id,
    learning_path_designation: {
      is_designated: true,
      source: 'learner_ai',
      flow: 'CAREER_PATH_DRIVEN',
      competency_target_name: data.competency_name,
      structured_path: true
    }
  };

  let topicSpecs = [];
  let moduleSpecs = []; // { topicIndex, module_name, module_description, module_order, originalIndex }

  if (
    data.learning_path.learning_modules &&
    Array.isArray(data.learning_path.learning_modules)
  ) {
    const originalLearningModules = data.learning_path.learning_modules;
    const modulesWithOriginalIndex = originalLearningModules.map(
      (moduleData, originalIndex) => ({ moduleData, originalIndex })
    );
    const sortedEntries = [...modulesWithOriginalIndex].sort(
      (a, b) => (a.moduleData.module_order || 0) - (b.moduleData.module_order || 0)
    );
    const sortedModules = sortedEntries.map((entry) => entry.moduleData);

    const learningPathForAI = [
      {
        name: data.learning_path.path_title,
        topicName: data.learning_path.path_title
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

    const allLessonsForAI = sortedModules.map((moduleData, index) => {
      const moduleOrder = moduleData.module_order || index + 1;
      const lessonId = `module_${moduleOrder}`;
      const descriptionPieces = [];
      if (Array.isArray(moduleData.steps)) {
        for (const step of moduleData.steps) {
          if (step.title) descriptionPieces.push(step.title);
          if (step.description) descriptionPieces.push(step.description);
        }
      }
      return {
        lessonId,
        lessonName: moduleData.module_title || `Module ${moduleOrder}`,
        description: descriptionPieces.join(' ').slice(0, 500),
        content_data: [],
        skills: Array.isArray(moduleData.skills_in_module)
          ? moduleData.skills_in_module
          : moduleData.skills_in_module
            ? [moduleData.skills_in_module]
            : []
      };
    });

    const aiStructureResult = await aiStructureGenerator.generateAIStructure({
      learningPath: learningPathForAI,
      skills: skillsForAI,
      allLessons: allLessonsForAI
    });

    if (
      !aiStructureResult ||
      !aiStructureResult.structure ||
      !Array.isArray(aiStructureResult.structure.topics)
    ) {
      topicSpecs = sortedModules.map((moduleData, index) => ({
        topic_name: moduleData.module_title || `Topic ${index + 1}`,
        topic_description: moduleData.module_description || null
      }));
    } else {
      topicSpecs = aiStructureResult.structure.topics.map((aiTopic) => ({
        topic_name: aiTopic.topic_name,
        topic_description: aiTopic.topic_description || null
      }));
    }

    const moduleIdToTopicIndex = new Map();
    if (aiStructureResult?.structure?.topics) {
      aiStructureResult.structure.topics.forEach((aiTopic, topicIndex) => {
        if (Array.isArray(aiTopic.modules)) {
          for (const aiModule of aiTopic.modules) {
            if (Array.isArray(aiModule.lesson_ids)) {
              for (const lessonId of aiModule.lesson_ids) {
                const moduleOrderMatch = lessonId.match(/module_(\d+)/);
                if (moduleOrderMatch) {
                  const moduleOrder = parseInt(moduleOrderMatch[1], 10);
                  moduleIdToTopicIndex.set(moduleOrder, topicIndex);
                }
              }
            }
          }
        }
      });
    }

    for (let i = 0; i < sortedEntries.length; i++) {
      const { moduleData, originalIndex } = sortedEntries[i];
      const moduleOrder = moduleData.module_order || i + 1;
      let topicIndex = moduleIdToTopicIndex.get(moduleOrder);
      if (topicIndex === undefined) {
        topicIndex = 0;
        if (topicSpecs.length === 0) {
          topicSpecs.push({ topic_name: 'Topic 1', topic_description: null });
        }
      }
      moduleSpecs.push({
        topicIndex,
        module_name: moduleData.module_title || `Module ${i + 1}`,
        module_description: moduleData.module_description || null,
        module_order: moduleOrder,
        originalIndex
      });
    }
  }

  return {
    data,
    courseSpec,
    topicSpecs,
    moduleSpecs,
    competencyTargetName: data.competency_name,
    learnerUserId: data.user_id
  };
}

/**
 * Delete previous matching personalized course (same product rule as sync),
 * using an existing transaction context.
 */
async function deletePreviousMatchingCourseInTx(
  t,
  competencyTargetName,
  userId
) {
  const existingCourse = await courseRepository.findByCompetencyAndLearner(
    competencyTargetName,
    userId,
    t
  );
  if (!existingCourse) {
    return false;
  }
  if (
    existingCourse.course_type !== 'learner_specific' ||
    existingCourse.created_by_user_id !== userId
  ) {
    return false;
  }

  const existingTopics = await topicRepository.findByCourseId(
    existingCourse.id,
    t
  );
  const topicIds = existingTopics.map((topic) => topic.id);
  const moduleIds = [];
  const lessonIds = [];

  for (const topic of existingTopics) {
    const modules = await moduleRepository.findByTopicId(topic.id, t);
    moduleIds.push(...modules.map((m) => m.id));
    for (const module of modules) {
      const lessons = await lessonRepository.findByModuleId(module.id, t);
      lessonIds.push(...lessons.map((l) => l.id));
    }
  }

  if (topicIds.length > 0) {
    await versionRepository.deleteByEntityIds('topic', topicIds, t);
  }
  if (moduleIds.length > 0) {
    await versionRepository.deleteByEntityIds('module', moduleIds, t);
  }
  if (lessonIds.length > 0) {
    await versionRepository.deleteByEntityIds('lesson', lessonIds, t);
  }
  await versionRepository.deleteByEntityIds('course', [existingCourse.id], t);
  await t.none('DELETE FROM courses WHERE id = $1', [existingCourse.id]);
  return true;
}

/**
 * Persist hierarchy + set job.course_id in ONE short fenced transaction.
 * Delete/rebuild of prior course runs only when job has no course_id yet
 * (genuine new hierarchy for this overall job).
 *
 * @returns {{ courseId: string, ownershipLost: boolean }}
 */
export async function persistHierarchyInFencedTransaction({
  jobId,
  expectedAttemptCount,
  plan
}) {
  return db.tx(async (t) => {
    const locked = await personalizedGenerationJobRepository.lockForFence(
      t,
      jobId,
      expectedAttemptCount,
      {
        stage: PERSONALIZED_JOB_STAGES.PREPARING_COURSE
      }
    );

    if (!locked) {
      return { courseId: null, ownershipLost: true };
    }

    // Already has hierarchy from a prior committed attempt — do not rebuild.
    if (locked.course_id) {
      await t.none(
        `UPDATE personalized_generation_jobs
         SET stage = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status = 'processing'
           AND attempt_count = $3
           AND lease_expires_at > CURRENT_TIMESTAMP`,
        [
          jobId,
          PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION,
          expectedAttemptCount
        ]
      );
      return { courseId: locked.course_id, ownershipLost: false, reused: true };
    }

    // Genuine new hierarchy for this job: delete prior matching course first.
    await deletePreviousMatchingCourseInTx(
      t,
      plan.competencyTargetName,
      plan.learnerUserId
    );

    const course = await courseRepository.create(plan.courseSpec, t);
    const createdTopics = [];
    for (const topicSpec of plan.topicSpecs) {
      const topic = await topicRepository.create(
        {
          course_id: course.id,
          topic_name: topicSpec.topic_name,
          topic_description: topicSpec.topic_description
        },
        t
      );
      createdTopics.push(topic);
    }

    const asyncModulePlacement = [];
    for (const moduleSpec of plan.moduleSpecs) {
      const assignedTopic = createdTopics[moduleSpec.topicIndex] || createdTopics[0];
      if (!assignedTopic) {
        throw new Error('Hierarchy persistence failed: no topics available for modules');
      }
      const module = await moduleRepository.create(
        {
          topic_id: assignedTopic.id,
          module_name: moduleSpec.module_name,
          module_description: moduleSpec.module_description
        },
        t
      );
      asyncModulePlacement.push({
        module_id: module.id,
        topic_id: assignedTopic.id,
        original_index: moduleSpec.originalIndex
      });
    }

    // Persist placement map for durable finalization (raw learning_modules order).
    const designation = {
      ...(plan.courseSpec.learning_path_designation || {}),
      async_module_placement: asyncModulePlacement
    };
    await t.none(
      `UPDATE courses
       SET learning_path_designation = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [course.id, JSON.stringify(designation)]
    );

    const updated = await t.oneOrNone(
      `UPDATE personalized_generation_jobs
       SET course_id = $2,
           stage = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status = 'processing'
         AND attempt_count = $4
         AND lease_expires_at > CURRENT_TIMESTAMP
         AND course_id IS NULL
       RETURNING *`,
      [
        jobId,
        course.id,
        PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION,
        expectedAttemptCount
      ]
    );

    if (!updated) {
      throw new Error('Failed to correlate job.course_id after hierarchy insert');
    }

    return { courseId: course.id, ownershipLost: false, reused: false };
  });
}

export default {
  buildHierarchyPlanOutsideTx,
  persistHierarchyInFencedTransaction
};
