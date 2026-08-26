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
  it('START action uses start_personalized_generation', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      csGenerationAction: 'start_personalized_generation'
    });
    expect(payload.cs_generation_action).toBe('start_personalized_generation');
    expect(payload.parent_course_builder_job_id).toBe('j1');
  });

  it('STATUS action uses get_personalized_generation_status', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      contentStudioJobId: 'cs1',
      csGenerationAction: 'get_personalized_generation_status'
    });
    expect(payload.cs_generation_action).toBe(
      'get_personalized_generation_status'
    );
    expect(payload.content_studio_job_id).toBe('cs1');
  });

  it('RESULT action uses get_personalized_generation_result', () => {
    const payload = contentStudioAsyncGateway.buildConservativeCsPayload({
      requestPayload,
      courseId: 'c1',
      parentCourseBuilderJobId: 'j1',
      contentStudioJobId: 'cs1',
      csGenerationAction: 'get_personalized_generation_result'
    });
    expect(payload.cs_generation_action).toBe(
      'get_personalized_generation_result'
    );
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
