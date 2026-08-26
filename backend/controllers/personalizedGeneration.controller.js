/**
 * Personalized generation readiness controller (learner-facing, read-only).
 */

import personalizedGenerationJobRepository from '../repositories/PersonalizedGenerationJobRepository.js';
import {
  getAuthenticatedLearnerId,
  sendAuthIdentityError
} from '../utils/authHelpers.js';

function toSafeJobView(job) {
  return {
    job_id: job.id,
    status: job.status,
    stage: job.stage,
    competency_target_name: job.competency_target_name,
    course_id: job.course_id,
    error_message: job.status === 'failed' ? (job.error_message || 'Generation failed') : null,
    created_at: job.created_at,
    updated_at: job.updated_at,
    completed_at: job.completed_at
  };
}

/**
 * GET /api/v1/personalized-generation/jobs
 */
export async function listPersonalizedGenerationJobs(req, res, next) {
  try {
    const learnerId = getAuthenticatedLearnerId(req);
    const jobs = await personalizedGenerationJobRepository.listByLearnerUserId(learnerId);
    return res.status(200).json({
      jobs: jobs.map(toSafeJobView)
    });
  } catch (error) {
    if (sendAuthIdentityError(res, error)) {
      return;
    }
    return next(error);
  }
}

export default {
  listPersonalizedGenerationJobs
};
