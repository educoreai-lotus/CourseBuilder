-- Migration: Add personalized_generation_jobs table
-- Date: 2026-08-24
-- Description: Additive overall durable job table for async personalized course generation.
--              Feature-flagged; does not alter courses/topics/modules/lessons.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'personalized_generation_jobs'
    ) THEN
        CREATE TABLE personalized_generation_jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            learner_user_id UUID NOT NULL,
            competency_target_name TEXT NOT NULL,
            request_payload JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
            stage TEXT NOT NULL DEFAULT 'accepted'
                CHECK (stage IN (
                    'accepted',
                    'preparing_course',
                    'starting_content_generation',
                    'waiting_for_content',
                    'finalizing_course',
                    'done'
                )),
            course_id UUID NULL REFERENCES courses(id) ON DELETE SET NULL,
            content_studio_job_id TEXT NULL,
            error_message TEXT NULL,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            locked_at TIMESTAMP NULL,
            lease_expires_at TIMESTAMP NULL,
            next_action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP NULL,
            completed_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_personalized_generation_jobs_status_next_action
    ON personalized_generation_jobs (status, next_action_at);

CREATE INDEX IF NOT EXISTS idx_personalized_generation_jobs_learner_competency
    ON personalized_generation_jobs (learner_user_id, competency_target_name);

CREATE INDEX IF NOT EXISTS idx_personalized_generation_jobs_course_id
    ON personalized_generation_jobs (course_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_personalized_generation_jobs_one_active
    ON personalized_generation_jobs (learner_user_id, competency_target_name)
    WHERE status IN ('pending', 'processing');
