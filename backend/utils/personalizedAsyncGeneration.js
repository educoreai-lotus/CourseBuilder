/**
 * Feature flag and constants for additive personalized async generation.
 * Enabled ONLY when PERSONALIZED_ASYNC_GENERATION_ENABLED === 'true'.
 */

export const PERSONALIZED_ASYNC_GENERATION_ENV = 'PERSONALIZED_ASYNC_GENERATION_ENABLED';

export function isPersonalizedAsyncGenerationEnabled() {
  return process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED === 'true';
}

/** Worker claim lease duration */
export const PERSONALIZED_JOB_LEASE_MS = 10 * 60 * 1000;

/** Heartbeat interval while a job is owned */
export const PERSONALIZED_JOB_HEARTBEAT_MS = 2.5 * 60 * 1000;

/** Poll interval for claiming due jobs */
export const PERSONALIZED_WORKER_POLL_MS = 5 * 1000;

/** Fixed transport retry delay for START/STATUS/RESULT failures */
export const PERSONALIZED_TRANSPORT_RETRY_MS = 45 * 1000;

/** STATUS pending/processing reschedule delay */
export const PERSONALIZED_STATUS_POLL_MS = 30 * 1000;

export const PERSONALIZED_JOB_STATUSES = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
});

export const PERSONALIZED_JOB_STAGES = Object.freeze({
  ACCEPTED: 'accepted',
  PREPARING_COURSE: 'preparing_course',
  STARTING_CONTENT_GENERATION: 'starting_content_generation',
  WAITING_FOR_CONTENT: 'waiting_for_content',
  FINALIZING_COURSE: 'finalizing_course',
  DONE: 'done'
});

export default {
  PERSONALIZED_ASYNC_GENERATION_ENV,
  isPersonalizedAsyncGenerationEnabled,
  PERSONALIZED_JOB_LEASE_MS,
  PERSONALIZED_JOB_HEARTBEAT_MS,
  PERSONALIZED_WORKER_POLL_MS,
  PERSONALIZED_TRANSPORT_RETRY_MS,
  PERSONALIZED_STATUS_POLL_MS,
  PERSONALIZED_JOB_STATUSES,
  PERSONALIZED_JOB_STAGES
};
