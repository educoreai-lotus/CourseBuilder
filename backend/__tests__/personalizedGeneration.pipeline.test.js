/**
 * Hierarchy / finalization / CS async stage unit tests.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import aiStructureGenerator from '../services/AIStructureGenerator.js';
import {
  buildHierarchyPlanOutsideTx,
  persistHierarchyInFencedTransaction
} from '../services/personalizedGeneration/hierarchyPreparation.js';
import {
  buildValidatedLessonSetInMemory,
  finalizeLessonsInFencedTransaction
} from '../services/personalizedGeneration/finalizationService.js';
import contentStudioAsyncGateway from '../services/personalizedGeneration/contentStudioAsyncGateway.js';
import courseRepository from '../repositories/CourseRepository.js';
import { PERSONALIZED_JOB_STAGES } from '../utils/personalizedAsyncGeneration.js';

const requestPayload = {
  user_id: 'learner-1',
  competency_target_name: 'React',
  learning_path: {
    path_title: 'React Path',
    learning_modules: [
      { module_order: 1, module_title: 'Module 1', steps: [{ title: 'A' }, { title: 'B' }] },
      { module_order: 2, module_title: 'Module 2', steps: [{ title: 'C' }, { title: 'D' }] }
    ]
  }
};

describe('hierarchy preparation', () => {
  const originalGenerate = aiStructureGenerator.generateAIStructure;

  afterEach(() => {
    aiStructureGenerator.generateAIStructure = originalGenerate;
  });

  it('AI structure generation occurs outside DB tx (plan builder calls AI)', async () => {
    aiStructureGenerator.generateAIStructure = jest.fn().mockResolvedValue({
      structure: {
        topics: [{ topic_name: 'T1', modules: [] }]
      }
    });

    const plan = await buildHierarchyPlanOutsideTx(requestPayload);

    expect(aiStructureGenerator.generateAIStructure).toHaveBeenCalled();
    expect(plan.courseSpec.course_type).toBe('learner_specific');
    expect(plan.courseSpec.status).toBe('active');
    expect(plan.moduleSpecs).toHaveLength(2);
    expect(plan.competencyTargetName).toBe('React');
  });
});

describe('RESULT validation before mutations', () => {
  const originalFindById = courseRepository.findById;

  afterEach(() => {
    courseRepository.findById = originalFindById;
  });

  it('invalid RESULT (topic count mismatch) throws before lesson rows built', async () => {
    courseRepository.findById = jest.fn().mockResolvedValue({
      id: 'course-1',
      learning_path_designation: {
        async_module_placement: [
          { module_id: 'm1', topic_id: 't1', original_index: 0 },
          { module_id: 'm2', topic_id: 't1', original_index: 1 }
        ]
      }
    });

    await expect(
      buildValidatedLessonSetInMemory({
        contentStudioResult: {
          course: [{ topics: [{ topic_name: 'A' }] }]
        },
        requestPayload,
        courseId: 'course-1'
      })
    ).rejects.toThrow(/topic count/);
  });

  it('valid RESULT builds complete lesson set in memory', async () => {
    courseRepository.findById = jest.fn().mockResolvedValue({
      id: 'course-1',
      learning_path_designation: {
        async_module_placement: [
          { module_id: 'm1', topic_id: 't1', original_index: 0 },
          { module_id: 'm2', topic_id: 't1', original_index: 1 }
        ]
      }
    });

    const { lessonRows } = await buildValidatedLessonSetInMemory({
      contentStudioResult: {
        course: [
          {
            topics: ['A', 'B', 'C', 'D'].map((topic_name) => ({
              topic_name,
              contents: [{ content_type: 'text', text: topic_name }]
            }))
          }
        ]
      },
      requestPayload,
      courseId: 'course-1'
    });

    expect(lessonRows).toHaveLength(4);
    expect(lessonRows[0].module_id).toBe('m1');
    expect(lessonRows[2].module_id).toBe('m2');
  });
});

describe('CS async gateway wrappers', () => {
  const learnerRequestPayload = {
    ...requestPayload,
    action: 'push_learning_path',
    description: 'from learner',
    user_name: 'Ada',
    company_id: 'co-1',
    company_name: 'Acme',
    skills_raw_data: ['hooks'],
    preferred_language: 'en',
    exam_status: 'pass'
  };

  it('START uses generate_course_content action and start_personalized_generation discriminator', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload: learnerRequestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      csGenerationAction: 'start_personalized_generation'
    });
    expect(payload.action).toBe('generate_course_content');
    expect(payload.cs_generation_action).toBe('start_personalized_generation');
    expect(payload.original_action).toBe('push_learning_path');
    expect(payload.parent_course_builder_job_id).toBe('j1');
    expect(learnerRequestPayload.action).toBe('push_learning_path');
  });

  it('STATUS uses generate_course_content action and get_personalized_generation_status discriminator', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload: learnerRequestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      contentStudioJobId: 'cs1',
      csGenerationAction: 'get_personalized_generation_status'
    });
    expect(payload.action).toBe('generate_course_content');
    expect(payload.cs_generation_action).toBe(
      'get_personalized_generation_status'
    );
    expect(payload.content_studio_job_id).toBe('cs1');
    expect(payload.original_action).toBe('push_learning_path');
  });

  it('RESULT uses generate_course_content action and get_personalized_generation_result discriminator', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload: learnerRequestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      contentStudioJobId: 'cs1',
      csGenerationAction: 'get_personalized_generation_result'
    });
    expect(payload.action).toBe('generate_course_content');
    expect(payload.cs_generation_action).toBe(
      'get_personalized_generation_result'
    );
    expect(payload.original_action).toBe('push_learning_path');
  });

  it('preserves original business fields and does not mutate stored request payload', () => {
    const frozen = { ...learnerRequestPayload };
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload: learnerRequestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      csGenerationAction: 'start_personalized_generation'
    });
    expect(payload.learning_path).toEqual(frozen.learning_path);
    expect(payload.skills_raw_data).toEqual(['hooks']);
    expect(payload.user_id).toBe('learner-1');
    expect(payload.user_name).toBe('Ada');
    expect(payload.company_id).toBe('co-1');
    expect(payload.company_name).toBe('Acme');
    expect(payload.preferred_language).toBe('en');
    expect(payload.competency_target_name).toBe('React');
    expect(payload.exam_status).toBe('pass');
    expect(learnerRequestPayload).toEqual(frozen);
    expect(learnerRequestPayload.action).toBe('push_learning_path');
  });
});

describe('finalization readiness semantics', () => {
  it('exports finalize and validate helpers for fenced completion boundary', () => {
    expect(typeof buildValidatedLessonSetInMemory).toBe('function');
    expect(typeof finalizeLessonsInFencedTransaction).toBe('function');
    expect(typeof persistHierarchyInFencedTransaction).toBe('function');
    expect(PERSONALIZED_JOB_STAGES.DONE).toBe('done');
    expect(PERSONALIZED_JOB_STAGES.FINALIZING_COURSE).toBe('finalizing_course');
  });
});
