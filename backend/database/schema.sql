-- Course Builder Database Schema - FULL REBUILD
-- PostgreSQL 15+
-- Created: 2025-11-13

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop ALL existing tables and types (CASCADE to handle dependencies)
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS versions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS course_type CASCADE;
DROP TYPE IF EXISTS course_status CASCADE;
DROP TYPE IF EXISTS course_level CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS exam_type CASCADE;
DROP TYPE IF EXISTS version_entity_type CASCADE;

-- ============================================
-- CREATE ENUM TYPES
-- ============================================
CREATE TYPE course_type AS ENUM ('learner_specific', 'trainer');
CREATE TYPE course_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE registration_status AS ENUM ('completed', 'in_progress', 'failed');
CREATE TYPE exam_type AS ENUM ('postcourse');
CREATE TYPE version_entity_type AS ENUM ('course', 'topic', 'module', 'lesson');

-- ============================================
-- TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. COURSES TABLE
-- ============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name TEXT NOT NULL,
    course_description TEXT,
    course_type course_type NOT NULL,
    status course_status DEFAULT 'draft',
    level course_level,
    duration_hours INT,
    start_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    created_by_user_id UUID,  -- trainer UUID (for trainer courses) or learner UUID (for personalized courses)
    
    -- Learning path metadata
    learning_path_designation JSONB DEFAULT '{}'::jsonb,
    -- {
    --   is_designated: boolean,
    --   target_competency: { competency_id, competency_name, target_level, max_test_attempts }
    -- }
        
    -- Student progress dictionary
    studentsIDDictionary JSONB DEFAULT '{}'::jsonb,
    -- student_id -> { status, enrolled_date, completed_date, completion_reason }
    
    -- Feedback dictionary
    feedbackDictionary JSONB DEFAULT '{}'::jsonb,
    -- user_id -> { rating, comment, submitted_at }
    
    -- Lesson completion dictionary
    lesson_completion_dictionary JSONB DEFAULT '{}'::jsonb
    -- lesson_completion_dictionary structure:
    -- lesson_id -> {
    --   topic_id,
    --   topic_name,
    --   trainer_ids,
    --   user_id -> {
    --       status,
    --       completed_at
    --   }
    -- }
);

CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_type ON courses(course_type);
CREATE INDEX idx_courses_created_by ON courses(created_by_user_id);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. TOPICS TABLE
-- ============================================
-- ⚠️ CRITICAL: Topics are STRUCTURAL CONTAINERS ONLY
-- Topics exist ONLY to maintain the hierarchy structure (Course → Topic → Module → Lesson)
-- Topics do NOT store actual content, skills, or any educational material
-- They provide grouping and navigation in the UI
-- All real content lives at the Lesson level
-- Course Builder wraps lessons inside Topics/Modules for structure only
-- Content Studio always provides lessons; Course Builder never creates placeholder lessons
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    topic_description TEXT
    -- Skills are ONLY stored at the Lesson level (lessons.skills)
    -- If topic-level skills are needed, they are computed dynamically by aggregating from lessons
);

CREATE INDEX idx_topics_course_id ON topics(course_id);

-- ============================================
-- 3. MODULES TABLE
-- ============================================
-- ⚠️ CRITICAL: Modules are STRUCTURAL CONTAINERS ONLY
-- Modules exist ONLY to maintain the hierarchy structure (Course → Topic → Module → Lesson)
-- Modules do NOT store actual content, skills, or any educational material
-- They provide grouping and navigation in the UI
-- All real content lives at the Lesson level
-- Course Builder wraps lessons inside Topics/Modules for structure only
-- Content Studio always provides lessons; Course Builder never creates placeholder lessons
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    module_description TEXT
);

CREATE INDEX idx_modules_topic_id ON modules(topic_id);

-- ============================================
-- 4. LESSONS TABLE
-- ============================================
-- ⚠️ CRITICAL: Lessons are the ONLY entity that stores real content
-- All actual learning content lives here: content_data, devlab_exercises, skills, trainer_ids
-- Topics and Modules are structural containers only - they have NO content
-- Content Studio is the ONLY source of lesson content (content_data, devlab_exercises)
-- Course Builder NEVER creates lesson content - it only structures content from Content Studio
-- For personalized courses: Learner AI → Course Builder → Content Studio → Course Builder
-- Content Studio generates personalized lessons, then Course Builder structures them
-- One Content Studio topic = one Course Builder lesson
-- Content Studio contents[] array → stored in lesson.content_data (entire array as JSONB)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    lesson_name TEXT NOT NULL,
    lesson_description TEXT,
    skills JSONB DEFAULT '[]'::jsonb NOT NULL,  -- Skills from Content Studio (array of skill strings)
    trainer_ids UUID[] DEFAULT '{}' NOT NULL,   -- Trainers who contributed (from Content Studio)
    content_type TEXT,                          -- Type of content: 'video' | 'article' | 'exercise' | 'mixed'
    -- Content Studio contents[] array - entire array stored as single JSONB
    -- Contains all content blocks: text_audio, code, presentation, audio, mind_map, avatar_video
    content_data JSONB DEFAULT '[]'::jsonb NOT NULL,  -- Raw content from Content Studio (entire contents[] array)
    -- DevLab exercises from Content Studio - array of exercise objects
    -- If Content Studio sends empty string "", normalize to empty array []
    devlab_exercises JSONB DEFAULT '[]'::jsonb NOT NULL,  -- Exercises from DevLab/Content Studio
    -- Validation constraints
    CONSTRAINT lessons_content_data_is_array CHECK (jsonb_typeof(content_data) = 'array'),
    CONSTRAINT lessons_devlab_exercises_is_array CHECK (jsonb_typeof(devlab_exercises) = 'array'),
    CONSTRAINT lessons_skills_is_array CHECK (jsonb_typeof(skills) = 'array')
);

CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_topic_id ON lessons(topic_id);
CREATE INDEX idx_lessons_trainer_ids ON lessons USING GIN(trainer_ids);

-- ============================================
-- 5. ASSESSMENTS TABLE
-- ============================================
-- Assessment results from Assessment microservice
-- ⚠️ CRITICAL: coverage_map is NOT stored in DB - it's computed dynamically from lessons
-- coverage_map is built from lessons table (lesson_id → skills) when sending to Assessment microservice
-- Built by assessmentDTO.buildSendPayload() which aggregates lessons by course
-- Course Builder sends coverage_map to Assessment, receives assessment results back
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL,
    learner_name TEXT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    exam_type exam_type NOT NULL DEFAULT 'postcourse',
    passing_grade NUMERIC(5,2) DEFAULT 70.00,
    final_grade NUMERIC(5,2),
    passed BOOLEAN
    -- coverage_map is NOT stored - computed dynamically from lessons.lessons table
    -- when building payload for Assessment microservice via assessmentDTO builder
);

CREATE INDEX idx_assessments_learner_id ON assessments(learner_id);
CREATE INDEX idx_assessments_course_id ON assessments(course_id);
CREATE INDEX idx_assessments_passed ON assessments(passed);

-- ============================================
-- 6. FEEDBACK TABLE
-- ============================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT now()
    -- Note: course_name is NOT stored in DB - it's looked up from course_id
    -- when sending to Directory microservice via directoryDTO builder
);

CREATE INDEX idx_feedback_learner_id ON feedback(learner_id);
CREATE INDEX idx_feedback_course_id ON feedback(course_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- ============================================
-- 7. REGISTRATIONS TABLE
-- ============================================
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL,
    learner_name TEXT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    company_id UUID,
    company_name TEXT,
    status registration_status DEFAULT 'in_progress',
    enrolled_date TIMESTAMP DEFAULT now(),
    completed_date TIMESTAMP,
    CONSTRAINT registrations_unique_learner_course UNIQUE (course_id, learner_id)
);

CREATE INDEX idx_registrations_learner_id ON registrations(learner_id);
CREATE INDEX idx_registrations_course_id ON registrations(course_id);
CREATE INDEX idx_registrations_status ON registrations(status);

-- ============================================
-- 8. VERSIONS TABLE
-- ============================================
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type version_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    version_number INT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT now(),
    CONSTRAINT versions_unique_entity_version UNIQUE (entity_type, entity_id, version_number)
);

CREATE INDEX idx_versions_entity ON versions(entity_type, entity_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE courses IS 'Main courses table with learning path metadata and dictionaries. Course Builder is a structuring orchestrator - it organizes content from Content Studio into the hierarchy. Course Builder NEVER creates lesson content - Content Studio is the ONLY source.';

COMMENT ON TABLE topics IS '⚠️ STRUCTURAL CONTAINER ONLY - Topics exist ONLY to maintain hierarchy (Course → Topic → Module → Lesson). Topics do NOT store actual content, skills, or educational material. They provide grouping and navigation in the UI. All real content lives at the Lesson level. Course Builder wraps lessons inside Topics for structure only.';

COMMENT ON TABLE modules IS '⚠️ STRUCTURAL CONTAINER ONLY - Modules exist ONLY to maintain hierarchy (Course → Topic → Module → Lesson). Modules do NOT store actual content, skills, or educational material. They provide grouping and navigation in the UI. All real content lives at the Lesson level. Course Builder wraps lessons inside Modules for structure only.';

COMMENT ON TABLE lessons IS '⚠️ LESSONS ARE THE ONLY ENTITY WITH REAL CONTENT - All actual learning content lives here: content_data (from Content Studio contents[]), devlab_exercises (from Content Studio), skills, trainer_ids. Content Studio is the ONLY source of lesson content. Course Builder NEVER creates lesson content - it only structures content from Content Studio. For personalized courses: Learner AI → Course Builder → Content Studio → Course Builder. One Content Studio topic = one Course Builder lesson.';

COMMENT ON TABLE assessments IS 'Assessment results from Assessment microservice. coverage_map is NOT stored - it is computed dynamically from lessons table (lesson_id → skills) when sending to Assessment microservice via assessmentDTO builder.';

COMMENT ON TABLE feedback IS 'Learner feedback for courses. course_name is NOT stored - it is looked up from course_id when sending to Directory microservice via directoryDTO builder.';

COMMENT ON TABLE registrations IS 'Learner course registrations with enrollment status and progress tracking.';

COMMENT ON TABLE versions IS 'Version history for courses, topics, modules, and lessons. Tracks changes to course structure and metadata.';

-- ============================================
-- COLUMN COMMENTS FOR CLARITY
-- ============================================
COMMENT ON COLUMN courses.created_by_user_id IS 'Trainer UUID (for trainer courses) or learner UUID (for personalized courses). NOT "AI UUID" - Course Builder never creates content.';

COMMENT ON COLUMN lessons.content_data IS '⚠️ Content Studio is the ONLY source - Entire contents[] array from Content Studio stored as single JSONB array. Contains all content blocks: text_audio, code, presentation, audio, mind_map, avatar_video. Course Builder stores this as-is from Content Studio - never modifies or generates it.';

COMMENT ON COLUMN lessons.devlab_exercises IS '⚠️ Content Studio is the ONLY source - Exercises from DevLab/Content Studio stored as JSONB array. If Content Studio sends empty string "", normalize to empty array []. Course Builder stores this as-is from Content Studio - never modifies or generates it.';

COMMENT ON COLUMN lessons.skills IS 'Skills associated with the lesson (from Content Studio). Skills are ONLY stored at the Lesson level - Topics do NOT store skills.';

COMMENT ON COLUMN assessments.passed IS 'Assessment pass/fail status. coverage_map is computed dynamically from lessons table when sending to Assessment microservice - not stored here.';

