/**
 * DB-backed personalized generation worker (overall CB job).
 * One execution at a time per process. Source of truth = personalized_generation_jobs.
 */

import personalizedGenerationJobRepository from '../../repositories/PersonalizedGenerationJobRepository.js';
import {
  buildHierarchyPlanOutsideTx,
  persistHierarchyInFencedTransaction
} from './hierarchyPreparation.js';
import {
  buildValidatedLessonSetInMemory,
  finalizeLessonsInFencedTransaction
} from './finalizationService.js';
import contentStudioAsyncGateway from './contentStudioAsyncGateway.js';
import {
  isPersonalizedAsyncGenerationEnabled,
  PERSONALIZED_JOB_LEASE_MS,
  PERSONALIZED_JOB_HEARTBEAT_MS,
  PERSONALIZED_WORKER_POLL_MS,
  PERSONALIZED_TRANSPORT_RETRY_MS,
  PERSONALIZED_STATUS_POLL_MS,
  PERSONALIZED_JOB_STAGES
} from '../../utils/personalizedAsyncGeneration.js';

let stopped = true;
let executing = false;
let pollTimer = null;
let heartbeatTimer = null;
let ownershipLost = false;
/** True after intentional fenced lease release for this claim execution. */
let claimReleased = false;
/** Set before fenced release so in-flight heartbeat callbacks no-op. */
let suppressHeartbeat = false;

function delayFromNow(ms) {
  return new Date(Date.now() + ms);
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(jobId, expectedAttemptCount) {
  clearHeartbeat();
  ownershipLost = false;
  claimReleased = false;
  suppressHeartbeat = false;
  heartbeatTimer = setInterval(async () => {
    if (suppressHeartbeat || claimReleased || ownershipLost) {
      return;
    }
    try {
      const updated = await personalizedGenerationJobRepository.heartbeat(
        jobId,
        expectedAttemptCount,
        { leaseMs: PERSONALIZED_JOB_LEASE_MS }
      );
      if (updated === 0) {
        ownershipLost = true;
        clearHeartbeat();
        console.warn(
          '[PersonalizedGenerationWorker] Heartbeat ownership lost',
          { jobId, expectedAttemptCount }
        );
      }
    } catch (error) {
      // Temporary DB errors must not perform unfenced writes.
      console.error(
        '[PersonalizedGenerationWorker] Heartbeat temporary error:',
        error.message
      );
    }
  }, PERSONALIZED_JOB_HEARTBEAT_MS);
  if (typeof heartbeatTimer.unref === 'function') {
    heartbeatTimer.unref();
  }
}

function shouldStopClaimWork() {
  return ownershipLost || claimReleased;
}

/**
 * Fenced defer: stop heartbeat FIRST, then schedule next_action_at and clear lease.
 * After success, this claim execution must not write again.
 */
async function deferAndRelease(jobId, expectedAttemptCount, options = {}) {
  if (shouldStopClaimWork()) return null;

  const {
    delayMs = PERSONALIZED_TRANSPORT_RETRY_MS,
    stage,
    contentStudioJobId,
    nextActionAt = delayFromNow(delayMs)
  } = options;

  // Prevent old heartbeat from racing to re-extend the lease after release.
  clearHeartbeat();
  suppressHeartbeat = true;

  const updated = await personalizedGenerationJobRepository.scheduleAndReleaseClaim(
    jobId,
    expectedAttemptCount,
    {
      nextActionAt,
      stage,
      contentStudioJobId
    }
  );

  if (!updated) {
    ownershipLost = true;
    return null;
  }

  claimReleased = true;
  return updated;
}

async function scheduleRetry(jobId, expectedAttemptCount, ms = PERSONALIZED_TRANSPORT_RETRY_MS) {
  return deferAndRelease(jobId, expectedAttemptCount, { delayMs: ms });
}

async function processPreparingCourse(job, expectedAttemptCount) {
  const plan = await buildHierarchyPlanOutsideTx(job.request_payload);
  if (shouldStopClaimWork()) return;

  const result = await persistHierarchyInFencedTransaction({
    jobId: job.id,
    expectedAttemptCount,
    plan
  });

  if (result.ownershipLost) {
    ownershipLost = true;
    return;
  }

  // Continue into START in the same execution after hierarchy commit.
  const refreshed = await personalizedGenerationJobRepository.findById(job.id);
  if (!refreshed || shouldStopClaimWork()) return;
  await processStartingContent(refreshed, expectedAttemptCount);
}

function hasValidContentStudioJobId(value) {
  if (value === null || value === undefined) return false;
  const asString = String(value).trim();
  return asString !== '' && asString !== 'null' && asString !== 'undefined';
}

async function processStartingContent(job, expectedAttemptCount) {
  if (shouldStopClaimWork()) return;

  try {
    const { generationJobId } = await contentStudioAsyncGateway.startPersonalizedGeneration({
      requestPayload: job.request_payload,
      courseId: job.course_id,
      parentCourseBuilderJobId: job.id
    });

    if (shouldStopClaimWork()) return;

    // Fail-closed: never advance to waiting_for_content without a real CS job id.
    if (!hasValidContentStudioJobId(generationJobId)) {
      throw new Error(
        'Content Studio START did not return a valid generation_job.cs_job_id'
      );
    }

    // START success: advance stage, persist CS child id, schedule poll, release lease.
    const updated = await deferAndRelease(job.id, expectedAttemptCount, {
      delayMs: PERSONALIZED_STATUS_POLL_MS,
      stage: PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT,
      contentStudioJobId: String(generationJobId).trim()
    });
    if (!updated) {
      return;
    }
  } catch (error) {
    console.error(
      '[PersonalizedGenerationWorker] START transport failure — will retry:',
      error.message
    );
    if (!shouldStopClaimWork()) {
      await scheduleRetry(job.id, expectedAttemptCount);
    }
  }
}

async function processWaitingForContent(job, expectedAttemptCount) {
  if (shouldStopClaimWork()) return;

  // Corrupt / invalid state: never call Coordinator without a CS child id.
  if (!hasValidContentStudioJobId(job.content_studio_job_id)) {
    console.error(
      '[PersonalizedGenerationWorker] waiting_for_content without Content Studio job id — marking failed'
    );
    await personalizedGenerationJobRepository.markFailed(
      job.id,
      expectedAttemptCount,
      'Missing Content Studio generation job id'
    );
    return;
  }

  try {
    const { status } = await contentStudioAsyncGateway.getPersonalizedGenerationStatus({
      requestPayload: job.request_payload,
      courseId: job.course_id,
      parentCourseBuilderJobId: job.id,
      contentStudioJobId: job.content_studio_job_id
    });

    if (shouldStopClaimWork()) return;

    if (status === 'pending' || status === 'processing') {
      await scheduleRetry(
        job.id,
        expectedAttemptCount,
        PERSONALIZED_STATUS_POLL_MS
      );
      return;
    }

    if (status === 'failed') {
      await personalizedGenerationJobRepository.markFailed(
        job.id,
        expectedAttemptCount,
        'Content generation failed'
      );
      return;
    }

    if (status === 'completed') {
      // Keep lease — continue finalizing in this same claim execution.
      const updated = await personalizedGenerationJobRepository.fencedUpdate(
        job.id,
        expectedAttemptCount,
        {
          stage: PERSONALIZED_JOB_STAGES.FINALIZING_COURSE,
          next_action_at: delayFromNow(0)
        }
      );
      if (!updated) {
        ownershipLost = true;
        return;
      }
      const refreshed = await personalizedGenerationJobRepository.findById(job.id);
      if (refreshed && !shouldStopClaimWork()) {
        await processFinalizing(refreshed, expectedAttemptCount);
      }
      return;
    }

    // Unknown business status — reschedule, do not treat as ready.
    await scheduleRetry(job.id, expectedAttemptCount);
  } catch (error) {
    console.error(
      '[PersonalizedGenerationWorker] STATUS transport failure — will retry:',
      error.message
    );
    if (!shouldStopClaimWork()) {
      await scheduleRetry(job.id, expectedAttemptCount);
    }
  }
}

async function processFinalizing(job, expectedAttemptCount) {
  if (shouldStopClaimWork()) return;

  try {
    const { result } = await contentStudioAsyncGateway.getPersonalizedGenerationResult({
      requestPayload: job.request_payload,
      courseId: job.course_id,
      parentCourseBuilderJobId: job.id,
      contentStudioJobId: job.content_studio_job_id
    });

    if (shouldStopClaimWork()) return;

    const resultStatus = String(
      result?.status || result?.generation_job?.status || ''
    ).toLowerCase();

    if (resultStatus === 'pending' || resultStatus === 'processing') {
      await scheduleRetry(job.id, expectedAttemptCount, PERSONALIZED_STATUS_POLL_MS);
      return;
    }

    if (resultStatus === 'failed' || resultStatus === 'error') {
      await personalizedGenerationJobRepository.markFailed(
        job.id,
        expectedAttemptCount,
        'Content generation result failed'
      );
      return;
    }

    // Validate fully in memory before any lesson mutation.
    let lessonRows;
    try {
      const validated = await buildValidatedLessonSetInMemory({
        contentStudioResult: result,
        requestPayload: job.request_payload,
        courseId: job.course_id
      });
      lessonRows = validated.lessonRows;
    } catch (validationError) {
      console.error(
        '[PersonalizedGenerationWorker] RESULT validation failed — no lesson mutations:',
        validationError.message
      );
      await personalizedGenerationJobRepository.markFailed(
        job.id,
        expectedAttemptCount,
        'Generated content failed validation'
      );
      return;
    }

    if (shouldStopClaimWork()) return;

    const finalizeResult = await finalizeLessonsInFencedTransaction({
      jobId: job.id,
      expectedAttemptCount,
      courseId: job.course_id,
      lessonRows
    });

    if (finalizeResult.ownershipLost) {
      ownershipLost = true;
    }
  } catch (error) {
    console.error(
      '[PersonalizedGenerationWorker] RESULT transport/finalize failure — will retry:',
      error.message
    );
    if (!shouldStopClaimWork()) {
      await scheduleRetry(job.id, expectedAttemptCount);
    }
  }
}

async function executeClaimedJob(job) {
  const expectedAttemptCount = job.attempt_count;
  startHeartbeat(job.id, expectedAttemptCount);

  try {
    const stage = job.stage;
    if (
      stage === PERSONALIZED_JOB_STAGES.ACCEPTED ||
      stage === PERSONALIZED_JOB_STAGES.PREPARING_COURSE
    ) {
      // Claim promotes accepted → preparing_course; handle both.
      if (!job.course_id) {
        await processPreparingCourse(job, expectedAttemptCount);
      } else {
        await processStartingContent(job, expectedAttemptCount);
      }
      return;
    }

    if (stage === PERSONALIZED_JOB_STAGES.STARTING_CONTENT_GENERATION) {
      await processStartingContent(job, expectedAttemptCount);
      return;
    }

    if (stage === PERSONALIZED_JOB_STAGES.WAITING_FOR_CONTENT) {
      await processWaitingForContent(job, expectedAttemptCount);
      return;
    }

    if (stage === PERSONALIZED_JOB_STAGES.FINALIZING_COURSE) {
      await processFinalizing(job, expectedAttemptCount);
    }
  } finally {
    clearHeartbeat();
  }
}

/**
 * Single tick — process-local executing guard acquired BEFORE claim.
 */
export async function tickPersonalizedGenerationWorker() {
  if (stopped || executing) {
    return;
  }

  executing = true;
  try {
    const job = await personalizedGenerationJobRepository.claimDueJob({
      leaseMs: PERSONALIZED_JOB_LEASE_MS
    });
    if (!job) {
      return;
    }
    ownershipLost = false;
    claimReleased = false;
    await executeClaimedJob(job);
  } catch (error) {
    console.error('[PersonalizedGenerationWorker] Tick error:', error.message);
  } finally {
    executing = false;
  }
}

export function startPersonalizedGenerationWorker() {
  if (!isPersonalizedAsyncGenerationEnabled()) {
    console.log(
      '[PersonalizedGenerationWorker] Not started (PERSONALIZED_ASYNC_GENERATION_ENABLED != true)'
    );
    return () => {};
  }

  if (!stopped && pollTimer) {
    return stopPersonalizedGenerationWorker;
  }

  stopped = false;
  console.log(
    `[PersonalizedGenerationWorker] Starting (poll=${PERSONALIZED_WORKER_POLL_MS}ms)`
  );

  tickPersonalizedGenerationWorker().catch((err) => {
    console.error('[PersonalizedGenerationWorker] Initial tick error:', err);
  });

  pollTimer = setInterval(() => {
    tickPersonalizedGenerationWorker().catch((err) => {
      console.error('[PersonalizedGenerationWorker] Poll error:', err);
    });
  }, PERSONALIZED_WORKER_POLL_MS);

  if (typeof pollTimer.unref === 'function') {
    pollTimer.unref();
  }

  return stopPersonalizedGenerationWorker;
}

export function stopPersonalizedGenerationWorker() {
  stopped = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  clearHeartbeat();
  console.log('[PersonalizedGenerationWorker] Stopped claiming new jobs');
}

/** Test helpers */
export function __resetWorkerStateForTests() {
  stopped = true;
  executing = false;
  ownershipLost = false;
  claimReleased = false;
  suppressHeartbeat = false;
  clearHeartbeat();
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Allow tick() without starting the poll loop (tests only). */
export function __armWorkerForTests() {
  stopped = false;
  executing = false;
  ownershipLost = false;
  claimReleased = false;
  suppressHeartbeat = false;
}

export function __getWorkerStateForTests() {
  return { stopped, executing, ownershipLost, claimReleased, suppressHeartbeat };
}

/** Test-only: run START stage for a claimed job snapshot. */
export async function __processStartingContentForTests(job, expectedAttemptCount) {
  ownershipLost = false;
  claimReleased = false;
  await processStartingContent(job, expectedAttemptCount);
  return __getWorkerStateForTests();
}

/** Test-only: run waiting_for_content STATUS handling. */
export async function __processWaitingForContentForTests(job, expectedAttemptCount) {
  ownershipLost = false;
  claimReleased = false;
  await processWaitingForContent(job, expectedAttemptCount);
  return __getWorkerStateForTests();
}

export default {
  startPersonalizedGenerationWorker,
  stopPersonalizedGenerationWorker,
  tickPersonalizedGenerationWorker
};
