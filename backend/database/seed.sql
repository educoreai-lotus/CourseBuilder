-- Seed Data for Course Builder
-- Test data for unit and integration testing
-- Created: 2025-11-04

-- Clear existing data (optional - use with caution in production)
-- TRUNCATE TABLE assessments, feedback, registrations, lessons, topics, modules, versions, courses CASCADE;

-- ============================================
-- SEED COURSES
-- ============================================
INSERT INTO courses (course_id, course_name, course_description, level, visibility, status, duration, average_rating, total_enrollments, active_enrollments, completion_rate, trainer_id, trainer_name, metadata, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'AI Fundamentals', 'Introduction to artificial intelligence concepts and machine learning basics', 'beginner', 'public', 'live', 480, 4.7, 125, 89, 72.5, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Trainer', '{"tags": ["AI", "Machine Learning", "Python"], "skills": ["python", "numpy", "pandas"], "category": "AI"}', NOW() - INTERVAL '30 days'),
('22222222-2222-2222-2222-222222222222', 'Secure Coding Practices', 'Best practices for writing secure code and preventing common vulnerabilities', 'intermediate', 'public', 'live', 360, 4.8, 98, 45, 68.2, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Aisha Expert', '{"tags": ["Security", "Best Practices", "OWASP"], "skills": ["security", "owasp", "encryption"], "category": "Security"}', NOW() - INTERVAL '15 days'),
('33333333-3333-3333-3333-333333333333', 'Advanced React Patterns', 'Deep dive into React hooks, context, and advanced component patterns', 'advanced', 'public', 'live', 600, 4.6, 67, 34, 58.3, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mike Developer', '{"tags": ["React", "Frontend", "JavaScript"], "skills": ["react", "hooks", "context"], "category": "Frontend"}', NOW() - INTERVAL '7 days'),
('44444444-4444-4444-4444-444444444444', 'Draft Course', 'This is a draft course not yet published', 'beginner', 'private', 'draft', 240, 0.0, 0, 0, 0.0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Trainer', '{"tags": ["Draft"], "skills": []}', NOW() - INTERVAL '2 days');

-- ============================================
-- SEED VERSIONS
-- ============================================
INSERT INTO versions (version_id, course_id, version_no, status, published_at, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'published', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 2, 'published', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 1, 'published', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('33333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 1, 'published', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('44444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 1, 'draft', NULL, NOW() - INTERVAL '2 days');

-- ============================================
-- SEED MODULES
-- ============================================
INSERT INTO modules (module_id, course_id, name, "order", metadata, created_at) VALUES
('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Introduction to AI', 1, '{"tags": ["intro"], "prerequisites": []}', NOW()),
('m1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Machine Learning Basics', 2, '{"tags": ["ml"], "prerequisites": ["intro"]}', NOW()),
('m1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Neural Networks', 3, '{"tags": ["neural"], "prerequisites": ["ml"]}', NOW()),
('m2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Security Fundamentals', 1, '{"tags": ["security"], "prerequisites": []}', NOW()),
('m2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Common Vulnerabilities', 2, '{"tags": ["vulnerabilities"], "prerequisites": ["security"]}', NOW()),
('m3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'React Hooks Deep Dive', 1, '{"tags": ["hooks"], "prerequisites": []}', NOW()),
('m3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Context API Patterns', 2, '{"tags": ["context"], "prerequisites": ["hooks"]}', NOW());

-- ============================================
-- SEED TOPICS
-- ============================================
INSERT INTO topics (topic_id, module_id, topic_name, topic_description, content_ref, topic_language, created_at) VALUES
('t1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 'What is AI?', 'Introduction to artificial intelligence concepts', 'content://ai-intro-1', 'English', NOW()),
('t1111111-1111-1111-1111-111111111112', 'm1111111-1111-1111-1111-111111111111', 'History of AI', 'Historical overview of AI development', 'content://ai-history-1', 'English', NOW()),
('t1111111-1111-1111-1111-111111111113', 'm1111111-1111-1111-1111-111111111112', 'Supervised Learning', 'Introduction to supervised learning algorithms', 'content://ml-supervised-1', 'English', NOW()),
('t2222222-2222-2222-2222-222222222221', 'm2222222-2222-2222-2222-222222222221', 'SQL Injection', 'Understanding and preventing SQL injection attacks', 'content://sec-sql-injection-1', 'English', NOW()),
('t3333333-3333-3333-3333-333333333331', 'm3333333-3333-3333-3333-333333333331', 'useState Hook', 'Deep dive into useState hook patterns', 'content://react-usestate-1', 'JavaScript', NOW()),
('t3333333-3333-3333-3333-333333333332', 'm3333333-3333-3333-3333-333333333331', 'useEffect Hook', 'Understanding useEffect and side effects', 'content://react-useeffect-1', 'JavaScript', NOW());

-- ============================================
-- SEED LESSONS
-- ============================================
INSERT INTO lessons (lesson_id, module_id, topic_id, lesson_name, content_type, content_data, micro_skills, nano_skills, enrichment_data, "order", created_at) VALUES
('l1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'AI Basics Lesson 1', 'text', '{"content": "Introduction to AI concepts...", "exercises": []}', '["ai-basics"]', '["understanding-ai"]', '{"youtube_links": ["https://youtube.com/watch?v=example1"], "github_links": []}', 1, NOW()),
('l1111111-1111-1111-1111-111111111112', 'm1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111112', 'History of AI Video', 'video', '{"video_url": "https://example.com/video", "transcript": "..."}', '["ai-history"]', '["ai-timeline"]', '{}', 2, NOW()),
('l2222222-2222-2222-2222-222222222221', 'm2222222-2222-2222-2222-222222222221', 't2222222-2222-2222-2222-222222222221', 'SQL Injection Exercise', 'exercise', '{"instructions": "Prevent SQL injection...", "test_cases": []}', '["security"]', '["sql-injection"]', '{"github_links": ["https://github.com/example/sec-demo"]}', 1, NOW()),
('l3333333-3333-3333-3333-333333333331', 'm3333333-3333-3333-3333-333333333331', 't3333333-3333-3333-3333-333333333331', 'useState Tutorial', 'text', '{"content": "useState hook tutorial...", "examples": []}', '["react-hooks"]', '["useState"]', '{"youtube_links": ["https://youtube.com/watch?v=react1"]}', 1, NOW());

-- ============================================
-- SEED REGISTRATIONS
-- ============================================
INSERT INTO registrations (registration_id, course_id, learner_id, learner_name, learner_company, progress, status, created_at) VALUES
('r1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'learner-001', 'Alice Learner', 'Company A', 75.5, 'in_progress', NOW() - INTERVAL '20 days'),
('r1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'learner-002', 'Bob Student', 'Company A', 100.0, 'completed', NOW() - INTERVAL '25 days'),
('r1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'learner-003', 'Charlie Developer', 'Company B', 45.0, 'in_progress', NOW() - INTERVAL '10 days'),
('r2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'learner-001', 'Alice Learner', 'Company A', 90.0, 'in_progress', NOW() - INTERVAL '12 days'),
('r3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'learner-004', 'Diana Engineer', 'Company C', 60.0, 'in_progress', NOW() - INTERVAL '5 days');

-- ============================================
-- SEED FEEDBACK
-- ============================================
INSERT INTO feedback (feedback_id, course_id, learner_id, rating, tags, comment, created_at) VALUES
('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'learner-002', 5.0, '["Clarity", "Usefulness"]', 'Very clear lessons and excellent explanations!', NOW() - INTERVAL '5 days'),
('f1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'learner-001', 4.5, '["Clarity", "Difficulty"]', 'Good content but some parts were challenging.', NOW() - INTERVAL '3 days'),
('f2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'learner-001', 4.8, '["Usefulness", "Clarity"]', 'Highly practical and well-structured.', NOW() - INTERVAL '2 days'),
('f3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'learner-004', 4.0, '["Difficulty"]', 'Advanced concepts but worth the effort.', NOW() - INTERVAL '1 day');

-- ============================================
-- SEED ASSESSMENTS
-- ============================================
INSERT INTO assessments (assessment_id, course_id, learner_id, coverage_map, grade, test_result, completion_date) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'learner-002', '{"topics": ["t1111111-1111-1111-1111-111111111111", "t1111111-1111-1111-1111-111111111112"], "modules": ["m1111111-1111-1111-1111-111111111111"]}', 92.5, 'pass', NOW() - INTERVAL '5 days'),
('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'learner-001', '{"topics": ["t2222222-2222-2222-2222-222222222221"], "modules": ["m2222222-2222-2222-2222-222222222221"]}', 88.0, 'pass', NOW() - INTERVAL '2 days'),
('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'learner-004', '{"topics": ["t3333333-3333-3333-3333-333333333331"], "modules": ["m3333333-3333-3333-3333-333333333331"]}', 75.0, 'pass', NOW() - INTERVAL '1 day');


