/**
 * Readiness API — safe fields only, learner-scoped.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { listPersonalizedGenerationJobs } from '../controllers/personalizedGeneration.controller.js';
import personalizedGenerationJobRepository from '../repositories/PersonalizedGenerationJobRepository.js';

describe('GET personalized-generation jobs readiness', () => {
  const originalList = personalizedGenerationJobRepository.listByLearnerUserId;

  afterEach(() => {
    personalizedGenerationJobRepository.listByLearnerUserId = originalList;
  });

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('returns only own jobs with safe fields', async () => {
    personalizedGenerationJobRepository.listByLearnerUserId = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'job-1',
          status: 'completed',
          stage: 'done',
          competency_target_name: 'React',
          course_id: 'course-1',
          content_studio_job_id: 'secret-cs',
          request_payload: { secrets: true },
          error_message: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
          completed_at: '2026-01-02'
        }
      ]);

    const req = { user: { directoryUserId: 'learner-1' } };
    const res = mockRes();
    await listPersonalizedGenerationJobs(req, res, jest.fn());

    expect(
      personalizedGenerationJobRepository.listByLearnerUserId
    ).toHaveBeenCalledWith('learner-1');
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toEqual({
      job_id: 'job-1',
      status: 'completed',
      stage: 'done',
      competency_target_name: 'React',
      course_id: 'course-1',
      error_message: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      completed_at: '2026-01-02'
    });
    expect(body.jobs[0].request_payload).toBeUndefined();
    expect(body.jobs[0].content_studio_job_id).toBeUndefined();
  });

  it('active job returns pending/processing without secrets', async () => {
    personalizedGenerationJobRepository.listByLearnerUserId = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'job-2',
          status: 'processing',
          stage: 'waiting_for_content',
          competency_target_name: 'Vue',
          course_id: 'course-2',
          content_studio_job_id: 'cs-hidden',
          request_payload: { huge: true },
          error_message: null,
          created_at: 't0',
          updated_at: 't1',
          completed_at: null
        }
      ]);

    const req = { user: { directoryUserId: 'learner-2' } };
    const res = mockRes();
    await listPersonalizedGenerationJobs(req, res, jest.fn());

    const job = res.json.mock.calls[0][0].jobs[0];
    expect(job.status).toBe('processing');
    expect(job.stage).toBe('waiting_for_content');
    expect(job.request_payload).toBeUndefined();
    expect(job.content_studio_job_id).toBeUndefined();
  });

  it('unauthorized when directoryUserId missing', async () => {
    const req = { user: {} };
    const res = mockRes();
    await listPersonalizedGenerationJobs(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('failed job exposes only safe error_message', async () => {
    personalizedGenerationJobRepository.listByLearnerUserId = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'job-3',
          status: 'failed',
          stage: 'done',
          competency_target_name: 'Go',
          course_id: null,
          request_payload: { jwt: 'x' },
          error_message: 'Content generation failed',
          created_at: 't0',
          updated_at: 't1',
          completed_at: 't1'
        }
      ]);

    const req = { user: { directoryUserId: 'learner-3' } };
    const res = mockRes();
    await listPersonalizedGenerationJobs(req, res, jest.fn());
    const job = res.json.mock.calls[0][0].jobs[0];
    expect(job.error_message).toBe('Content generation failed');
    expect(job.request_payload).toBeUndefined();
  });
});
