/**
 * Async Content Studio gateway wrappers (START / STATUS / RESULT).
 * Always Course Builder → Coordinator → Content Studio.
 * Does NOT alter the legacy synchronous sendToContentStudio path.
 */

import { postToCoordinator } from '../gateways/coordinatorClient.js';

function safeBusinessError(message) {
  const error = new Error(message || 'Content Studio async call failed');
  error.status = 502;
  return error;
}

/**
 * Build conservative routing payload from the original Learner request plus
 * course / job identifiers required for CS async actions.
 */
export function buildConservativeCsPayload({
  requestPayload,
  courseId,
  parentCourseBuilderJobId,
  contentStudioJobId,
  csGenerationAction
}) {
  const payload = {
    ...requestPayload,
    action: requestPayload?.action || 'generate_course_content',
    description:
      requestPayload?.description ||
      'Generate course content from learning path',
    cs_generation_action: csGenerationAction,
    parent_course_builder_job_id: parentCourseBuilderJobId
  };

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
  return String(rawCsJobId);
}

/**
 * START personalized generation on Content Studio.
 * @returns {{ generationJobId: string|null, result: object }}
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

  return { generationJobId, result };
}

/**
 * STATUS poll for personalized generation.
 * @returns {{ status: string, result: object }}
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

  const status =
    result?.status ||
    result?.generation_job?.status ||
    result?.generation_status ||
    'unknown';

  return { status: String(status).toLowerCase(), result };
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

  if (!result || typeof result !== 'object') {
    throw safeBusinessError('Content Studio RESULT was empty');
  }

  return { result };
}

export default {
  buildConservativeCsPayload,
  extractContentStudioJobId,
  startPersonalizedGeneration,
  getPersonalizedGenerationStatus,
  getPersonalizedGenerationResult
};
