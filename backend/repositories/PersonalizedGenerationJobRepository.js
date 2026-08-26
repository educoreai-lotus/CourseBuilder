/**
 * Personalized Generation Job Repository
 * Durable overall job for async personalized course generation.
 */

import db from '../config/database.js';
import {
  PERSONALIZED_JOB_LEASE_MS,
  PERSONALIZED_JOB_STATUSES,
  PERSONALIZED_JOB_STAGES
} from '../utils/personalizedAsyncGeneration.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    learner_user_id: row.learner_user_id,
    competency_target_name: row.competency_target_name,
    request_payload: row.request_payload,
    status: row.status,
    stage: row.stage,
    course_id: row.course_id,
    content_studio_job_id: row.content_studio_job_id,
    error_message: row.error_message,
    attempt_count: row.attempt_count,
    locked_at: row.locked_at,
    lease_expires_at: row.lease_expires_at,
    next_action_at: row.next_action_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class PersonalizedGenerationJobRepository {
  /**
   * Create a new pending job, or return existing active job for same learner+competency.
   * Relies on partial unique index under concurrency.
   */
  async createOrGetActiveJob({ learnerUserId, competencyTargetName, requestPayload }) {
    const existing = await this.findActiveByLearnerAndCompetency(
      learnerUserId,
      competencyTargetName
    );
    if (existing) {
      return { job: existing, created: false };
    }

    try {
      const row = await db.one(
        `INSERT INTO personalized_generation_jobs (
           learner_user_id,
           competency_target_name,
           request_payload,
           status,
           stage,
           next_action_at
         ) VALUES ($1, $2, $3::jsonb, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          learnerUserId,
          competencyTargetName,
          JSON.stringify(requestPayload),
          PERSONALIZED_JOB_STATUSES.PENDING,
          PERSONALIZED_JOB_STAGES.ACCEPTED
        ]
      );
      return { job: mapRow(row), created: true };
    } catch (error) {
      // Concurrent insert raced the partial unique index — return winner.
      if (error?.code === '23505') {
        const raced = await this.findActiveByLearnerAndCompetency(
          learnerUserId,
          competencyTargetName
        );
        if (raced) {
          return { job: raced, created: false };
        }
      }
      throw error;
    }
  }

  async findActiveByLearnerAndCompetency(learnerUserId, competencyTargetName) {
    const row = await db.oneOrNone(
      `SELECT * FROM personalized_generation_jobs
       WHERE learner_user_id = $1
         AND competency_target_name = $2
         AND status IN ('pending', 'processing')
       ORDER BY created_at DESC
       LIMIT 1`,
      [learnerUserId, competencyTargetName]
    );
    return mapRow(row);
  }

  async findById(jobId) {
    const row = await db.oneOrNone(
      `SELECT * FROM personalized_generation_jobs WHERE id = $1`,
      [jobId]
    );
    return mapRow(row);
  }

  async listByLearnerUserId(learnerUserId, { limit = 50 } = {}) {
    const rows = await db.any(
      `SELECT * FROM personalized_generation_jobs
       WHERE learner_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [learnerUserId, limit]
    );
    return rows.map(mapRow);
  }

  /**
   * Claim one due job. Returns job with post-increment attempt_count, or null.
   */
  async claimDueJob({ leaseMs = PERSONALIZED_JOB_LEASE_MS } = {}) {
    return db.tx(async (t) => {
      const selected = await t.oneOrNone(
        `SELECT id
         FROM personalized_generation_jobs
         WHERE status IN ('pending', 'processing')
           AND next_action_at <= CURRENT_TIMESTAMP
           AND (
             status = 'pending'
             OR lease_expires_at IS NULL
             OR lease_expires_at < CURRENT_TIMESTAMP
           )
         ORDER BY next_action_at ASC, created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );

      if (!selected) {
        return null;
      }

      const leaseSeconds = Math.max(1, Math.floor(leaseMs / 1000));
      const row = await t.one(
        `UPDATE personalized_generation_jobs
         SET status = 'processing',
             attempt_count = attempt_count + 1,
             locked_at = CURRENT_TIMESTAMP,
             lease_expires_at = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second'),
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP,
             stage = CASE
               WHEN stage = 'accepted' THEN 'preparing_course'
               ELSE stage
             END
         WHERE id = $1
         RETURNING *`,
        [selected.id, leaseSeconds]
      );
      return mapRow(row);
    });
  }

  /**
   * Heartbeat: extend lease if ownership still held.
   * @returns {number} updated row count (0 = ownership lost)
   */
  async heartbeat(jobId, expectedAttemptCount, { leaseMs = PERSONALIZED_JOB_LEASE_MS } = {}) {
    const leaseSeconds = Math.max(1, Math.floor(leaseMs / 1000));
    const result = await db.result(
      `UPDATE personalized_generation_jobs
       SET locked_at = CURRENT_TIMESTAMP,
           lease_expires_at = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status = 'processing'
         AND attempt_count = $2
         AND lease_expires_at IS NOT NULL
         AND lease_expires_at > CURRENT_TIMESTAMP`,
      [jobId, expectedAttemptCount, leaseSeconds]
    );
    return result.rowCount;
  }

  /**
   * Fenced stage / field update. Returns updated job or null if ownership lost.
   */
  async fencedUpdate(jobId, expectedAttemptCount, fields = {}) {
    const sets = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [jobId, expectedAttemptCount];
    let i = 3;

    if (fields.stage !== undefined) {
      sets.push(`stage = $${i++}`);
      values.push(fields.stage);
    }
    if (fields.course_id !== undefined) {
      sets.push(`course_id = $${i++}`);
      values.push(fields.course_id);
    }
    if (fields.content_studio_job_id !== undefined) {
      sets.push(`content_studio_job_id = $${i++}`);
      values.push(fields.content_studio_job_id);
    }
    if (fields.next_action_at !== undefined) {
      sets.push(`next_action_at = $${i++}`);
      values.push(fields.next_action_at);
    }
    if (fields.error_message !== undefined) {
      sets.push(`error_message = $${i++}`);
      values.push(fields.error_message);
    }
    if (fields.status !== undefined) {
      sets.push(`status = $${i++}`);
      values.push(fields.status);
    }
    if (fields.completed_at !== undefined) {
      sets.push(`completed_at = $${i++}`);
      values.push(fields.completed_at);
    }

    const row = await db.oneOrNone(
      `UPDATE personalized_generation_jobs
       SET ${sets.join(', ')}
       WHERE id = $1
         AND status = 'processing'
         AND attempt_count = $2
         AND lease_expires_at IS NOT NULL
         AND lease_expires_at > CURRENT_TIMESTAMP
       RETURNING *`,
      values
    );
    return mapRow(row);
  }

  /**
   * Schedule next_action_at and intentionally release the current claim lease
   * so the job becomes claimable when next_action_at is due (lease_expires_at IS NULL).
   * Preserves status=processing and attempt_count. Fenced by ownership.
   * Optional stage / content_studio_job_id may be set in the same fenced write.
   * @returns {object|null} updated job, or null if ownership lost (0 rows)
   */
  async scheduleAndReleaseClaim(
    jobId,
    expectedAttemptCount,
    { nextActionAt, stage, contentStudioJobId } = {}
  ) {
    const sets = [
      'next_action_at = $3',
      'locked_at = NULL',
      'lease_expires_at = NULL',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    const values = [jobId, expectedAttemptCount, nextActionAt];
    let i = 4;

    if (stage !== undefined) {
      sets.push(`stage = $${i++}`);
      values.push(stage);
    }
    if (contentStudioJobId !== undefined) {
      sets.push(`content_studio_job_id = $${i++}`);
      values.push(
        contentStudioJobId === null || contentStudioJobId === undefined
          ? contentStudioJobId
          : String(contentStudioJobId)
      );
    }

    const row = await db.oneOrNone(
      `UPDATE personalized_generation_jobs
       SET ${sets.join(', ')}
       WHERE id = $1
         AND status = 'processing'
         AND attempt_count = $2
         AND lease_expires_at IS NOT NULL
         AND lease_expires_at > CURRENT_TIMESTAMP
       RETURNING *`,
      values
    );
    return mapRow(row);
  }

  /**
   * @deprecated Prefer scheduleAndReleaseClaim for defer paths.
   * Kept as alias that releases the lease (same semantics as scheduleAndReleaseClaim).
   */
  async scheduleNextAction(jobId, expectedAttemptCount, nextActionAt) {
    return this.scheduleAndReleaseClaim(jobId, expectedAttemptCount, {
      nextActionAt
    });
  }

  async markFailed(jobId, expectedAttemptCount, errorMessage) {
    return this.fencedUpdate(jobId, expectedAttemptCount, {
      status: PERSONALIZED_JOB_STATUSES.FAILED,
      stage: PERSONALIZED_JOB_STAGES.DONE,
      error_message: errorMessage || 'Personalized generation failed',
      completed_at: new Date(),
      next_action_at: new Date()
    });
  }

  /**
   * Claim eligibility helper for tests / diagnostics.
   * Mirrors claimDueJob WHERE predicates for a single in-memory job snapshot.
   */
  static isDueAndClaimable(job, now = new Date()) {
    if (!job) return false;
    if (!['pending', 'processing'].includes(job.status)) return false;
    const nextAt = job.next_action_at ? new Date(job.next_action_at) : null;
    if (!nextAt || nextAt > now) return false;
    if (job.status === 'pending') return true;
    if (job.lease_expires_at == null) return true;
    return new Date(job.lease_expires_at) < now;
  }

  /**
   * Lock job for update inside an existing transaction (fence before writes).
   */
  async lockForFence(t, jobId, expectedAttemptCount, { stage = null, courseId = null } = {}) {
    const params = [jobId, expectedAttemptCount];
    let sql = `
      SELECT *
      FROM personalized_generation_jobs
      WHERE id = $1
        AND status = 'processing'
        AND attempt_count = $2
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at > CURRENT_TIMESTAMP`;

    if (stage) {
      params.push(stage);
      sql += ` AND stage = $${params.length}`;
    }
    if (courseId) {
      params.push(courseId);
      sql += ` AND course_id = $${params.length}`;
    }

    sql += ' FOR UPDATE';
    const row = await t.oneOrNone(sql, params);
    return mapRow(row);
  }
}

export default new PersonalizedGenerationJobRepository();
