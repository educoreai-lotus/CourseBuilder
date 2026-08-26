/**
 * Async Content Studio gateway wrappers (START / STATUS / RESULT).
 * Always Course Builder → Coordinator → Content Studio.
 * Does NOT alter the legacy synchronous sendToContentStudio path.
 */

import { postToCoordinator } from '../gateways/coordinatorClient.js';

/** Proven Coordinator → Content Studio routing action (same as sync path). */
export const CS_COORDINATOR_ROUTING_ACTION = 'generate_course_content';

const KNOWN_CS_STATUS = new Set(['pending', 'processing', 'completed', 'failed']);

function safeBusinessError(message) {
  const error = new Error(message || 'Content Studio async call failed');
  error.status = 502;
  return error;
}

/**
 * Build conservative routing payload from the original Learner request plus
 * course / job identifiers required for CS async actions.
 *
 * Coordinator routes on payload.action — always use generate_course_content.
 * Content Studio distinguishes async ops via cs_generation_action.
 * Original Learner action is preserved as original_action (not used for routing).
 */
export function buildConservativeCsPayload({
  requestPayload,
  courseId,
  parentCourseBuilderJobId,
  contentStudioJobId,
  csGenerationAction
}) {
  const originalAction =
    requestPayload?.action != null && String(requestPayload.action).trim() !== ''
      ? requestPayload.action
      : undefined;

  const payload = {
    ...requestPayload,
    // Coordinator-facing routing action (must NOT remain push_learning_path).
    action: CS_COORDINATOR_ROUTING_ACTION,
    description:
      requestPayload?.description ||
      'Generate course content from learning path',
    cs_generation_action: csGenerationAction,
    parent_course_builder_job_id: parentCourseBuilderJobId
  };

  if (originalAction !== undefined) {
    payload.original_action = originalAction;
  }

  if (courseId) {
    payload.course_id = courseId;
  }
  if (contentStudioJobId) {
    payload.content_studio_job_id = contentStudioJobId;
  }

  return payload;
}

async function postCsEnvelope(sendPayload, responseTemplate = {}) {
  const envelope = {
    requester_service: 'course-builder-service',
    payload: sendPayload,
    response: responseTemplate
  };

  const { data: json } = await postToCoordinator(envelope);
  const result =
    json && json.response ? json.response : json && json.success ? json.data : json;
  return { envelopeResponse: json, result: result || {} };
}

/**
 * Parse Content Studio child job id from START (or compatible) response body.
 * Primary deployed field: generation_job.cs_job_id
 */
export function extractContentStudioJobId(result) {
  const rawCsJobId =
    result?.generation_job?.cs_job_id ??
    result?.generation_job?.id ??
    result?.generation_job?.job_id ??
    (typeof result?.generation_job === 'string' ? result.generation_job : null) ??
    result?.content_studio_job_id ??
    null;

  if (rawCsJobId === null || rawCsJobId === undefined) {
    return null;
  }
  const asString = String(rawCsJobId).trim();
  if (asString === '' || asString === 'null' || asString === 'undefined') {
    return null;
  }
  return asString;
}

export function isValidContentStudioJobId(jobId) {
  return typeof jobId === 'string' && jobId.trim() !== '';
}

/**
 * Extract known CS business status; returns null if missing/unknown.
 */
export function extractKnownContentStudioStatus(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const raw =
    result?.status ??
    result?.generation_job?.status ??
    result?.generation_status ??
    null;
  if (raw === null || raw === undefined) {
    return null;
  }
  const normalized = String(raw).toLowerCase().trim();
  if (!KNOWN_CS_STATUS.has(normalized)) {
    return null;
  }
  return normalized;
}

/**
 * Reject empty / Learner-ACK-shaped bodies that lack CS RESULT content.
 */
export function assertValidContentStudioResult(result) {
  if (!result || typeof result !== 'object') {
    throw safeBusinessError('Content Studio RESULT was empty');
  }

  // Wrong-service Learner-style ACK: empty object or only routing echo fields.
  const keys = Object.keys(result);
  if (keys.length === 0) {
    throw safeBusinessError('Content Studio RESULT was empty');
  }

  const hasCourse = Array.isArray(result.course);
  const hasGenerationJob =
    result.generation_job != null && typeof result.generation_job === 'object';
  const hasStatus =
    result.status != null ||
    result.generation_job?.status != null ||
    result.generation_status != null;

  // Accept CS RESULT envelopes used by finalization (course array) or
  // status-bearing generation envelopes (pending/processing/failed before content).
  if (!hasCourse && !hasGenerationJob && !hasStatus) {
    throw safeBusinessError('Content Studio RESULT was not a valid generation result');
  }

  // Explicitly reject obvious Learner push_learning_path ACK shapes.
  if (
    result.action === 'push_learning_path' ||
    (result.response && typeof result.response === 'object' && !hasCourse && !hasGenerationJob)
  ) {
    throw safeBusinessError('Content Studio RESULT was not a valid generation result');
  }

  return result;
}

/**
 * START personalized generation on Content Studio.
 * @returns {{ generationJobId: string, result: object }}
 * @throws if CS job id is missing (fail-closed; caller retries START)
 */
export async function startPersonalizedGeneration({
  requestPayload,
  courseId,
  parentCourseBuilderJobId
}) {
  const sendPayload = buildConservativeCsPayload({
    requestPayload,
    courseId,
    parentCourseBuilderJobId,
    csGenerationAction: 'start_personalized_generation'
  });

  const { result } = await postCsEnvelope(sendPayload, {
    generation_job: null
  });

  const generationJobId = extractContentStudioJobId(result);
  if (!isValidContentStudioJobId(generationJobId)) {
    throw safeBusinessError(
      'Content Studio START did not return a valid generation_job.cs_job_id'
    );
  }

  return { generationJobId, result };
}

/**
 * STATUS poll for personalized generation.
 * @returns {{ status: string, result: object }}
 * @throws if status is missing/unknown (not a valid CS business status)
 */
export async function getPersonalizedGenerationStatus({
  requestPayload,
  courseId,
  parentCourseBuilderJobId,
  contentStudioJobId
}) {
  const sendPayload = buildConservativeCsPayload({
    requestPayload,
    courseId,
    parentCourseBuilderJobId,
    contentStudioJobId,
    csGenerationAction: 'get_personalized_generation_status'
  });

  const { result } = await postCsEnvelope(sendPayload, {
    status: null,
    generation_job: null
  });

  const status = extractKnownContentStudioStatus(result);
  if (!status) {
    throw safeBusinessError(
      'Content Studio STATUS did not return a known generation status'
    );
  }

  return { status, result };
}

/**
 * RESULT fetch — returns legacy fillCourseBuilderService-shaped envelope body.
 */
export async function getPersonalizedGenerationResult({
  requestPayload,
  courseId,
  parentCourseBuilderJobId,
  contentStudioJobId
}) {
  const sendPayload = buildConservativeCsPayload({
    requestPayload,
    courseId,
    parentCourseBuilderJobId,
    contentStudioJobId,
    csGenerationAction: 'get_personalized_generation_result'
  });

  const { result } = await postCsEnvelope(sendPayload, {
    course: [],
    status: null
  });

  assertValidContentStudioResult(result);

  return { result };
}

export default {
  CS_COORDINATOR_ROUTING_ACTION,
  buildConservativeCsPayload,
  extractContentStudioJobId,
  isValidContentStudioJobId,
  extractKnownContentStudioStatus,
  assertValidContentStudioResult,
  startPersonalizedGeneration,
  getPersonalizedGenerationStatus,
  getPersonalizedGenerationResult
};
