/**
 * Blocker fixes: lease release on defer + CS cs_job_id parsing.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import personalizedGenerationJobRepository, {
  PersonalizedGenerationJobRepository
} from '../repositories/PersonalizedGenerationJobRepository.js';
import contentStudioAsyncGateway, {
  extractContentStudioJobId
} from '../services/personalizedGeneration/contentStudioAsyncGateway.js';
import {
  __resetWorkerStateForTests,
  __processStartingContentForTests,
  __processWaitingForContentForTests
} from '../services/personalizedGeneration/personalizedGenerationWorker.js';
import { PERSONALIZED_JOB_STAGES } from '../utils/personalizedAsyncGeneration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoSrc = fs.readFileSync(
  path.join(__dirname, '..', 'repositories', 'PersonalizedGenerationJobRepository.js'),
  'utf8'
);

describe('claim eligibility after lease release (poll ~30s, not ~10m)', () => {
  it('processing job with null lease is claimable when next_action_at is due', () => {
    const now = new Date('2026-08-24T12:00:30.000Z');
    const job = {
      status: 'processing',
      next_action_at: new Date('2026-08-24T12:00:00.000Z'),
      lease_expires_at: null,
      attempt_count: 1
    };
    expect(PersonalizedGenerationJobRepository.isDueAndClaimable(job, now)).toBe(true);
  });

  it('processing job with valid 10-minute lease is NOT claimable even if next_action_at elapsed', () => {
    const now = new Date('2026-08-24T12:00:30.000Z');
    const job = {
      status: 'processing',
      next_action_at: new Date('2026-08-24T12:00:00.000Z'),
      lease_expires_at: new Date('2026-08-24T12:10:00.000Z'),
      attempt_count: 1
    };
    expect(PersonalizedGenerationJobRepository.isDueAndClaimable(job, now)).toBe(false);
  });

  it('after scheduleAndReleaseClaim, due next_action_at is claimable without waiting for lease expiry', async () => {
    const nextActionAt = new Date(Date.now() + 30_000);
    const original = personalizedGenerationJobRepository.scheduleAndReleaseClaim;

    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest
      .fn()
      .mockImplementation(async (jobId, attempt, opts) => ({
        id: jobId,
        status: 'processing',
        stage: opts.stage || 'waiting_for_content',
        attempt_count: attempt,
        locked_at: null,
        lease_expires_at: null,
        next_action_at: opts.nextActionAt
      }));

    try {
      const updated = await personalizedGenerationJobRepository.scheduleAndReleaseClaim(
        'job-1',
        1,
        {
          nextActionAt,
          stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
        }
      );

      expect(updated.lease_expires_at).toBeNull();
      expect(updated.locked_at).toBeNull();
      expect(updated.attempt_count).toBe(1);
      expect(updated.status).toBe('processing');

      expect(
        PersonalizedGenerationJobRepository.isDueAndClaimable(
          {
            status: updated.status,
            next_action_at: new Date(Date.now() - 1000),
            lease_expires_at: updated.lease_expires_at
          },
          new Date()
        )
      ).toBe(true);
    } finally {
      personalizedGenerationJobRepository.scheduleAndReleaseClaim = original;
    }
  });
});

describe('fenced release + heartbeat predicates', () => {
  it('scheduleAndReleaseClaim clears lease under ownership fence', () => {
    expect(repoSrc).toMatch(
      /async scheduleAndReleaseClaim[\s\S]*locked_at = NULL[\s\S]*lease_expires_at = NULL/
    );
    expect(repoSrc).toMatch(
      /scheduleAndReleaseClaim[\s\S]*AND status = 'processing'[\s\S]*AND attempt_count = \$2[\s\S]*lease_expires_at > CURRENT_TIMESTAMP/
    );
  });

  it('heartbeat requires existing unexpired lease (cannot reacquire after release)', () => {
    expect(repoSrc).toMatch(
      /async heartbeat[\s\S]*lease_expires_at IS NOT NULL[\s\S]*lease_expires_at > CURRENT_TIMESTAMP/
    );
  });

  it('claimDueJob allows processing jobs with lease_expires_at IS NULL', () => {
    expect(repoSrc).toMatch(
      /claimDueJob[\s\S]*lease_expires_at IS NULL[\s\S]*FOR UPDATE SKIP LOCKED/
    );
  });

  it('heartbeat with released lease returns 0 rows', async () => {
    const original = personalizedGenerationJobRepository.heartbeat;
    personalizedGenerationJobRepository.heartbeat = jest.fn().mockResolvedValue(0);
    try {
      expect(await personalizedGenerationJobRepository.heartbeat('job-1', 1)).toBe(0);
    } finally {
      personalizedGenerationJobRepository.heartbeat = original;
    }
  });
});

describe('stale worker cannot release new owner', () => {
  it('scheduleAndReleaseClaim with wrong attempt returns null', async () => {
    const original = personalizedGenerationJobRepository.scheduleAndReleaseClaim;
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest
      .fn()
      .mockImplementation(async (_id, attempt) => {
        if (attempt !== 2) return null;
        return {
          id: 'job-1',
          status: 'processing',
          attempt_count: 2,
          locked_at: null,
          lease_expires_at: null,
          next_action_at: new Date(),
          stage: 'waiting_for_content'
        };
      });

    try {
      expect(
        await personalizedGenerationJobRepository.scheduleAndReleaseClaim('job-1', 1, {
          nextActionAt: new Date(Date.now() + 30_000)
        })
      ).toBeNull();

      const owner = await personalizedGenerationJobRepository.scheduleAndReleaseClaim(
        'job-1',
        2,
        { nextActionAt: new Date(Date.now() + 30_000) }
      );
      expect(owner.attempt_count).toBe(2);
    } finally {
      personalizedGenerationJobRepository.scheduleAndReleaseClaim = original;
    }
  });
});

describe('CS START cs_job_id contract', () => {
  let originalStart;
  let originalStatus;
  let originalRelease;
  let originalMarkFailed;

  beforeEach(() => {
    __resetWorkerStateForTests();
    originalStart = contentStudioAsyncGateway.startPersonalizedGeneration;
    originalStatus = contentStudioAsyncGateway.getPersonalizedGenerationStatus;
    originalRelease = personalizedGenerationJobRepository.scheduleAndReleaseClaim;
    originalMarkFailed = personalizedGenerationJobRepository.markFailed;
  });

  afterEach(() => {
    contentStudioAsyncGateway.startPersonalizedGeneration = originalStart;
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = originalStatus;
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = originalRelease;
    personalizedGenerationJobRepository.markFailed = originalMarkFailed;
    __resetWorkerStateForTests();
  });

  it('parses generation_job.cs_job_id from deployed CS START response shape', () => {
    const response = {
      generation_job: {
        cs_job_id: 123,
        parent_course_builder_job_id: 'cb-job-1',
        status: 'pending'
      }
    };

    expect(extractContentStudioJobId(response)).toBe('123');
    expect(extractContentStudioJobId(response)).not.toBeNull();
  });

  it('START success persists cs_job_id, waits, releases lease, does not complete', async () => {
    contentStudioAsyncGateway.startPersonalizedGeneration = jest.fn().mockResolvedValue({
      generationJobId: '123',
      result: {
        generation_job: {
          cs_job_id: 123,
          parent_course_builder_job_id: 'cb-job-1',
          status: 'pending'
        }
      }
    });

    let releasedArgs = null;
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest
      .fn()
      .mockImplementation(async (jobId, attempt, opts) => {
        releasedArgs = { jobId, attempt, opts };
        return {
          id: jobId,
          status: 'processing',
          stage: opts.stage,
          attempt_count: attempt,
          content_studio_job_id: String(opts.contentStudioJobId),
          locked_at: null,
          lease_expires_at: null,
          next_action_at: opts.nextActionAt,
          completed_at: null
        };
      });
    personalizedGenerationJobRepository.markFailed = jest.fn();

    const job = {
      id: 'cb-job-1',
      course_id: 'course-1',
      request_payload: { user_id: 'u1', competency_target_name: 'React' },
      content_studio_job_id: null,
      stage: PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION
    };

    const state = await __processStartingContentForTests(job, 1);

    expect(releasedArgs).toMatchObject({ jobId: 'cb-job-1', attempt: 1 });
    expect(releasedArgs.opts.stage).toBe(PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT);
    expect(releasedArgs.opts.contentStudioJobId).toBe('123');
    expect(releasedArgs.opts.nextActionAt).toBeInstanceOf(Date);
    expect(state.claimReleased).toBe(true);
    expect(personalizedGenerationJobRepository.markFailed).not.toHaveBeenCalled();
  });

  it('START with null generationJobId does not advance to waiting_for_content', async () => {
    contentStudioAsyncGateway.startPersonalizedGeneration = jest.fn().mockResolvedValue({
      generationJobId: null,
      result: { generation_job: null }
    });

    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn().mockResolvedValue({
      id: 'cb-job-1',
      status: 'processing',
      attempt_count: 1,
      locked_at: null,
      lease_expires_at: null
    });
    personalizedGenerationJobRepository.markFailed = jest.fn();

    const job = {
      id: 'cb-job-1',
      course_id: 'course-1',
      request_payload: { action: 'push_learning_path' },
      content_studio_job_id: null,
      stage: PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION
    };

    await __processStartingContentForTests(job, 1);

    const releaseCalls = personalizedGenerationJobRepository.scheduleAndReleaseClaim.mock.calls;
    const advancedToWaiting = releaseCalls.some(
      (call) => call[2]?.stage === PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
    );
    expect(advancedToWaiting).toBe(false);
    expect(personalizedGenerationJobRepository.markFailed).not.toHaveBeenCalled();
  });

  it('START missing cs_job_id (gateway throw) does not advance to waiting_for_content', async () => {
    contentStudioAsyncGateway.startPersonalizedGeneration = jest
      .fn()
      .mockRejectedValue(new Error('Content Studio START did not return a valid generation_job.cs_job_id'));

    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn().mockResolvedValue({
      id: 'cb-job-1',
      status: 'processing',
      attempt_count: 1,
      locked_at: null,
      lease_expires_at: null
    });

    await __processStartingContentForTests(
      {
        id: 'cb-job-1',
        course_id: 'course-1',
        request_payload: {},
        content_studio_job_id: null,
        stage: PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION
      },
      1
    );

    const advancedToWaiting =
      personalizedGenerationJobRepository.scheduleAndReleaseClaim.mock.calls.some(
        (call) => call[2]?.stage === PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
      );
    expect(advancedToWaiting).toBe(false);
  });

  it('waiting_for_content + NULL content_studio_job_id does not call Coordinator and marks failed', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest.fn();
    personalizedGenerationJobRepository.markFailed = jest.fn().mockResolvedValue({
      id: 'job-1',
      status: 'failed'
    });
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn();

    await __processWaitingForContentForTests(
      {
        id: 'job-1',
        course_id: 'c1',
        request_payload: {},
        content_studio_job_id: null,
        stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
      },
      1
    );

    expect(contentStudioAsyncGateway.getPersonalizedGenerationStatus).not.toHaveBeenCalled();
    expect(personalizedGenerationJobRepository.markFailed).toHaveBeenCalledWith(
      'job-1',
      1,
      'Missing Content Studio generation job id'
    );
    expect(personalizedGenerationJobRepository.scheduleAndReleaseClaim).not.toHaveBeenCalled();
  });

  it('STATUS processing defers with lease release so poll is claimable', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest
      .fn()
      .mockResolvedValue({ status: 'processing', result: { status: 'processing' } });

    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest
      .fn()
      .mockResolvedValue({
        id: 'job-1',
        status: 'processing',
        stage: 'waiting_for_content',
        attempt_count: 1,
        locked_at: null,
        lease_expires_at: null,
        next_action_at: new Date(Date.now() + 30_000)
      });

    const job = {
      id: 'job-1',
      course_id: 'c1',
      request_payload: {},
      content_studio_job_id: '123',
      stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
    };

    const state = await __processWaitingForContentForTests(job, 1);

    expect(personalizedGenerationJobRepository.scheduleAndReleaseClaim).toHaveBeenCalled();
    expect(state.claimReleased).toBe(true);
    expect(
      PersonalizedGenerationJobRepository.isDueAndClaimable(
        {
          status: 'processing',
          next_action_at: new Date(Date.now() - 1),
          lease_expires_at: null
        },
        new Date()
      )
    ).toBe(true);
  });

  it('STATUS pending schedules normal polling', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest
      .fn()
      .mockResolvedValue({ status: 'pending', result: { status: 'pending' } });
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn().mockResolvedValue({
      id: 'job-1',
      status: 'processing',
      attempt_count: 1,
      locked_at: null,
      lease_expires_at: null
    });

    await __processWaitingForContentForTests(
      {
        id: 'job-1',
        course_id: 'c1',
        request_payload: {},
        content_studio_job_id: 'cs-1',
        stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
      },
      1
    );

    expect(personalizedGenerationJobRepository.scheduleAndReleaseClaim).toHaveBeenCalled();
  });

  it('STATUS failed marks overall job failed', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest
      .fn()
      .mockResolvedValue({ status: 'failed', result: { status: 'failed' } });
    personalizedGenerationJobRepository.markFailed = jest.fn().mockResolvedValue({ status: 'failed' });
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn();

    await __processWaitingForContentForTests(
      {
        id: 'job-1',
        course_id: 'c1',
        request_payload: {},
        content_studio_job_id: 'cs-1',
        stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
      },
      2
    );

    expect(personalizedGenerationJobRepository.markFailed).toHaveBeenCalledWith(
      'job-1',
      2,
      'Content generation failed'
    );
  });

  it('STATUS completed advances toward finalization stage', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest
      .fn()
      .mockResolvedValue({ status: 'completed', result: { status: 'completed' } });

    const originalFenced = personalizedGenerationJobRepository.fencedUpdate;
    const originalFind = personalizedGenerationJobRepository.findById;
    const originalResult = contentStudioAsyncGateway.getPersonalizedGenerationResult;
    personalizedGenerationJobRepository.fencedUpdate = jest.fn().mockResolvedValue({
      id: 'job-1',
      stage: PERSONALIZED_JOB_STAGES.FINALIZING_COURSE
    });
    personalizedGenerationJobRepository.findById = jest.fn().mockResolvedValue({
      id: 'job-1',
      course_id: 'c1',
      request_payload: {},
      content_studio_job_id: 'cs-1',
      stage: PERSONALIZED_JOB_STAGES.FINALIZING_COURSE,
      attempt_count: 1
    });
    // Avoid deep RESULT finalization in this unit test.
    contentStudioAsyncGateway.getPersonalizedGenerationResult = jest
      .fn()
      .mockRejectedValue(new Error('stop before finalize'));
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn().mockResolvedValue({
      id: 'job-1',
      status: 'processing',
      attempt_count: 1,
      locked_at: null,
      lease_expires_at: null
    });

    try {
      await __processWaitingForContentForTests(
        {
          id: 'job-1',
          course_id: 'c1',
          request_payload: {},
          content_studio_job_id: 'cs-1',
          stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
        },
        1
      );

      expect(personalizedGenerationJobRepository.fencedUpdate).toHaveBeenCalledWith(
        'job-1',
        1,
        expect.objectContaining({
          stage: PERSONALIZED_JOB_STAGES.FINALIZING_COURSE
        })
      );
    } finally {
      personalizedGenerationJobRepository.fencedUpdate = originalFenced;
      personalizedGenerationJobRepository.findById = originalFind;
      contentStudioAsyncGateway.getPersonalizedGenerationResult = originalResult;
    }
  });

  it('malformed STATUS (gateway throw) does not advance to finalization', async () => {
    contentStudioAsyncGateway.getPersonalizedGenerationStatus = jest
      .fn()
      .mockRejectedValue(new Error('Content Studio STATUS did not return a known generation status'));
    const originalFenced = personalizedGenerationJobRepository.fencedUpdate;
    personalizedGenerationJobRepository.fencedUpdate = jest.fn();
    personalizedGenerationJobRepository.scheduleAndReleaseClaim = jest.fn().mockResolvedValue({
      id: 'job-1',
      status: 'processing',
      attempt_count: 1,
      locked_at: null,
      lease_expires_at: null
    });

    try {
      await __processWaitingForContentForTests(
        {
          id: 'job-1',
          course_id: 'c1',
          request_payload: {},
          content_studio_job_id: 'cs-1',
          stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT
        },
        1
      );

      expect(personalizedGenerationJobRepository.fencedUpdate).not.toHaveBeenCalled();
      expect(personalizedGenerationJobRepository.scheduleAndReleaseClaim).toHaveBeenCalled();
    } finally {
      personalizedGenerationJobRepository.fencedUpdate = originalFenced;
    }
  });
});
