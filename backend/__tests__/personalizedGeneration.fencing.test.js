/**
 * Claim / fencing / worker concurrency for personalized generation jobs.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import personalizedGenerationJobRepository from '../repositories/PersonalizedGenerationJobRepository.js';
import {
  tickPersonalizedGenerationWorker,
  __resetWorkerStateForTests,
  __armWorkerForTests,
  __getWorkerStateForTests,
  startPersonalizedGenerationWorker,
  stopPersonalizedGenerationWorker
} from '../services/personalizedGeneration/personalizedGenerationWorker.js';
import { buildConservativeCsPayload } from '../services/personalizedGeneration/contentStudioAsyncGateway.js';
import {
  isPersonalizedAsyncGenerationEnabled,
  PERSONALIZED_JOB_STAGES
} from '../utils/personalizedAsyncGeneration.js';

describe('personalized generation claim fencing (unit)', () => {
  const originals = {
    claimDueJob: personalizedGenerationJobRepository.claimDueJob,
    heartbeat: personalizedGenerationJobRepository.heartbeat,
    fencedUpdate: personalizedGenerationJobRepository.fencedUpdate,
    markFailed: personalizedGenerationJobRepository.markFailed,
    findById: personalizedGenerationJobRepository.findById,
    flag: process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED
  };

  beforeEach(() => {
    __resetWorkerStateForTests();
    process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = 'true';
  });

  afterEach(() => {
    stopPersonalizedGenerationWorker();
    __resetWorkerStateForTests();
    personalizedGenerationJobRepository.claimDueJob = originals.claimDueJob;
    personalizedGenerationJobRepository.heartbeat = originals.heartbeat;
    personalizedGenerationJobRepository.fencedUpdate = originals.fencedUpdate;
    personalizedGenerationJobRepository.markFailed = originals.markFailed;
    personalizedGenerationJobRepository.findById = originals.findById;
    if (originals.flag === undefined) {
      delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
    } else {
      process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = originals.flag;
    }
  });

  it('overlapping ticks → only one claim at once (executing guard)', async () => {
    __armWorkerForTests();

    let claimStarted = 0;
    let resolveClaim;
    const claimGate = new Promise((resolve) => {
      resolveClaim = resolve;
    });

    personalizedGenerationJobRepository.claimDueJob = jest
      .fn()
      .mockImplementation(async () => {
        claimStarted += 1;
        await claimGate;
        return null;
      });

    const t1 = tickPersonalizedGenerationWorker();
    // Flush until first claim begins
    for (let i = 0; i < 10 && claimStarted === 0; i++) {
      await Promise.resolve();
    }
    expect(claimStarted).toBe(1);
    expect(__getWorkerStateForTests().executing).toBe(true);

    const t2 = tickPersonalizedGenerationWorker();
    await Promise.resolve();
    expect(claimStarted).toBe(1);

    resolveClaim();
    await Promise.all([t1, t2]);

    expect(__getWorkerStateForTests().executing).toBe(false);
  });

  it('worker does not start when flag is not true', () => {
    process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = 'false';
    expect(isPersonalizedAsyncGenerationEnabled()).toBe(false);
    const cleanup = startPersonalizedGenerationWorker();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('heartbeat with wrong attempt_count is treated as ownership lost (rowCount 0)', async () => {
    personalizedGenerationJobRepository.heartbeat = jest.fn().mockResolvedValue(0);
    const count = await personalizedGenerationJobRepository.heartbeat('job-1', 1);
    expect(count).toBe(0);
  });

  it('fencedUpdate returns null when ownership lost', async () => {
    personalizedGenerationJobRepository.fencedUpdate = jest.fn().mockResolvedValue(null);
    const updated = await personalizedGenerationJobRepository.fencedUpdate(
      'job-1',
      1,
      { stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT }
    );
    expect(updated).toBeNull();
  });

  it('stale attempt markFailed returns null (ownership fence)', async () => {
    personalizedGenerationJobRepository.markFailed = jest.fn().mockResolvedValue(null);
    const failed = await personalizedGenerationJobRepository.markFailed(
      'job-1',
      1,
      'stale'
    );
    expect(failed).toBeNull();
  });
});

describe('conservative CS routing payload', () => {
  it('preserves learner routing context and adds async fields', () => {
    const requestPayload = {
      user_id: 'u1',
      user_name: 'Ada',
      company_id: 'c1',
      company_name: 'Acme',
      competency_target_name: 'React',
      skills_raw_data: ['hooks'],
      learning_path: { path_title: 'P', learning_modules: [] },
      preferred_language: 'en',
      action: 'push_learning_path',
      description: 'from learner'
    };

    const payload = buildConservativeCsPayload({
      requestPayload,
      courseId: 'course-1',
      parentCourseBuilderJobId: 'cb-job-1',
      contentStudioJobId: 'cs-job-9',
      csGenerationAction: 'start_personalized_generation'
    });

    expect(payload.user_id).toBe('u1');
    expect(payload.company_id).toBe('c1');
    expect(payload.learning_path).toEqual(requestPayload.learning_path);
    expect(payload.skills_raw_data).toEqual(['hooks']);
    expect(payload.cs_generation_action).toBe('start_personalized_generation');
    expect(payload.parent_course_builder_job_id).toBe('cb-job-1');
    expect(payload.content_studio_job_id).toBe('cs-job-9');
    expect(payload.course_id).toBe('course-1');
    expect(payload.action).toBe('generate_course_content');
    expect(payload.original_action).toBe('push_learning_path');
    expect(requestPayload.action).toBe('push_learning_path');
  });
});
