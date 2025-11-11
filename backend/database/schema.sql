-- Course Builder Database Schema
-- PostgreSQL 15+
-- Created: 2025-11-04

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS versions CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Drop ENUM types if they exist (must be after tables due to dependencies)
DROP TYPE IF EXISTS content_type CASCADE;
DROP TYPE IF EXISTS version_status CASCADE;
DROP TYPE IF EXISTS assessment_result CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS course_status CASCADE;
DROP TYPE IF EXISTS course_visibility CASCADE;
DROP TYPE IF EXISTS course_level CASCADE;

-- Create ENUM types
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE course_visibility AS ENUM ('private', 'public', 'scheduled');
CREATE TYPE course_status AS ENUM ('draft', 'live', 'archived');
CREATE TYPE registration_status AS ENUM ('in_progress', 'completed', 'failed');
CREATE TYPE assessment_result AS ENUM ('pass', 'fail');
CREATE TYPE version_status AS ENUM ('draft', 'validated', 'published', 'archived');
CREATE TYPE content_type AS ENUM ('text', 'video', 'exercise', 'presentation');

-- ============================================
-- COMMON TRIGGER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name TEXT NOT NULL,
    course_description TEXT,
    level course_level,
    visibility course_visibility DEFAULT 'private',
    status course_status DEFAULT 'draft',
    duration INTEGER, -- Duration in minutes
    average_rating DECIMAL(2,1) DEFAULT 0.0,
    total_enrollments INTEGER DEFAULT 0,
    active_enrollments INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    trainer_id UUID, -- Reference to Directory/Auth service
    trainer_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- AI tags, enrichment info, skills, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT courses_rating_check CHECK (average_rating >= 0 AND average_rating <= 5),
    CONSTRAINT courses_completion_check CHECK (completion_rate >= 0 AND completion_rate <= 100)
);

-- ============================================
-- VERSIONS TABLE
-- ============================================
CREATE TABLE versions (
    version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    status version_status DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT versions_unique_course_version UNIQUE (course_id, version_no)
);

-- ============================================
-- MODULES TABLE
-- ============================================
CREATE TABLE modules (
    module_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb, -- Tags, prerequisites
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT modules_unique_order UNIQUE (course_id, "order")
);

-- ============================================
-- TOPICS TABLE
-- ============================================
CREATE TABLE topics (
    topic_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    topic_description TEXT,
    content_ref TEXT, -- Reference to content storage
    topic_language TEXT, -- Programming language, natural language, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LESSONS TABLE (if needed for backward compatibility)
-- ============================================
CREATE TABLE lessons (
    lesson_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(module_id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(topic_id) ON DELETE CASCADE,
    lesson_name TEXT NOT NULL,
    content_type content_type DEFAULT 'text',
    content_data JSONB DEFAULT '{}'::jsonb, -- Lesson or exercise content
    micro_skills JSONB DEFAULT '[]'::jsonb, -- From Content Studio
    nano_skills JSONB DEFAULT '[]'::jsonb, -- Most granular skills
    devlab_exercises JSONB DEFAULT '[]'::jsonb, -- Links to DevLab exercises
    enrichment_data JSONB DEFAULT '{}'::jsonb, -- AI metadata, YouTube/GitHub refs
    enriched_content JSONB DEFAULT '{}'::jsonb, -- LLM-generated enrichment payload
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REGISTRATIONS TABLE
-- ============================================
CREATE TABLE registrations (
    registration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    learner_id UUID NOT NULL, -- Reference to Auth microservice
    learner_name TEXT,
    learner_company TEXT,
    progress DECIMAL(5,2) DEFAULT 0.0, -- Completion percentage
    status registration_status DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT registrations_unique_learner_course UNIQUE (course_id, learner_id),
    CONSTRAINT registrations_progress_check CHECK (progress >= 0 AND progress <= 100)
);

-- ============================================
-- LESSON PROGRESS TABLE
-- ============================================
CREATE TABLE lesson_progress (
    progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lesson_progress_unique UNIQUE (registration_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_registration ON lesson_progress(registration_id);
CREATE INDEX idx_lesson_progress_course ON lesson_progress(course_id, lesson_id);

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb, -- e.g., ["Clarity", "Usefulness", "Difficulty"]
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT feedback_unique_learner_course UNIQUE (course_id, learner_id) -- One feedback per learner per course
);

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ASSESSMENTS TABLE
-- ============================================
CREATE TABLE assessments (
    assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    learner_id UUID NOT NULL,
    coverage_map JSONB DEFAULT '{}'::jsonb, -- Map of topics/modules covered
    grade DECIMAL(5,2), -- Score out of 100
    test_result assessment_result,
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assessments_grade_check CHECK (grade >= 0 AND grade <= 100)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_courses_status_visibility ON courses(status, visibility);
CREATE INDEX idx_courses_trainer_id ON courses(trainer_id);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_topics_module_id ON topics(module_id);
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_topic_id ON lessons(topic_id);
CREATE INDEX idx_registrations_course_id ON registrations(course_id);
CREATE INDEX idx_registrations_learner_id ON registrations(learner_id);
CREATE INDEX idx_feedback_course_id ON feedback(course_id);
CREATE INDEX idx_feedback_learner_id ON feedback(learner_id);
CREATE INDEX idx_assessments_course_id ON assessments(course_id);
CREATE INDEX idx_assessments_learner_id ON assessments(learner_id);
CREATE INDEX idx_versions_course_id ON versions(course_id);

-- ============================================
-- TRIGGERS
-- ============================================
-- Auto-update updated_at timestamp
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


