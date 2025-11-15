import db from '../config/database.js';

// Jest globals are available without import in Node.js environment

describe('Database Schema Tests', () => {
  afterAll(() => {
    // Database pool is closed in global teardown.
  });

  describe('Table Existence', () => {
    it('should have courses table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have modules table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modules')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have topics table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'topics')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have lessons table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have registrations table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registrations')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have feedback table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have assessments table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have versions table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'versions')"
      );
      expect(result.exists).toBe(true);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have topics.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'topics'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have modules.topic_id foreign key to topics', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'modules'
            AND kcu.column_name = 'topic_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have lessons.module_id foreign key to modules', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'lessons'
            AND kcu.column_name = 'module_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have lessons.topic_id foreign key to topics', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'lessons'
            AND kcu.column_name = 'topic_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have registrations.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'registrations'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have feedback.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'feedback'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have assessments.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'assessments'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    // Exercises table removed - exercises come from Content Studio as lessons.devlab_exercises (JSONB array)
  });

  describe('Unique Constraints', () => {
    it('should have unique constraint on registrations (course_id, learner_id)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'registrations'
            AND constraint_name = 'registrations_unique_learner_course'
            AND constraint_type = 'UNIQUE'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have unique constraint on versions (entity_type, entity_id, version_number)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'versions'
            AND constraint_name = 'versions_unique_entity_version'
            AND constraint_type = 'UNIQUE'
        )
      `);
      expect(result.exists).toBe(true);
    });
  });

  describe('Check Constraints', () => {
    it('should have rating check constraint on feedback (1-5)', async () => {
      // Check constraint is inline: CHECK (rating BETWEEN 1 AND 5)
      // Verify by checking table_constraints for feedback table with check constraint
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'feedback'
            AND tc.constraint_type = 'CHECK'
            AND ccu.column_name = 'rating'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have content_data check constraint on lessons (must be array)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_schema = 'public'
            AND constraint_name = 'lessons_content_data_is_array'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have devlab_exercises check constraint on lessons (must be array)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_schema = 'public'
            AND constraint_name = 'lessons_devlab_exercises_is_array'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have skills check constraint on lessons (must be array)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_schema = 'public'
            AND constraint_name = 'lessons_skills_is_array'
        )
      `);
      expect(result.exists).toBe(true);
    });
  });

  describe('Seed Data Validation', () => {
    it('should have accessible courses table', async () => {
      const count = await db.one('SELECT COUNT(*)::int as count FROM courses');
      expect(typeof count.count).toBe('number');
      // Table exists and is accessible (count can be 0 if no seed data)
    });

    it('should have accessible modules table', async () => {
      const count = await db.one('SELECT COUNT(*)::int as count FROM modules');
      expect(typeof count.count).toBe('number');
      // Table exists and is accessible (count can be 0 if no seed data)
    });

    it('should have accessible topics table', async () => {
      const count = await db.one('SELECT COUNT(*)::int as count FROM topics');
      expect(typeof count.count).toBe('number');
      // Table exists and is accessible (count can be 0 if no seed data)
    });

    it('should have accessible registrations table', async () => {
      const count = await db.one('SELECT COUNT(*)::int as count FROM registrations');
      expect(typeof count.count).toBe('number');
      // Table exists and is accessible (count can be 0 if no seed data)
    });

    it('should have accessible feedback table', async () => {
      const count = await db.one('SELECT COUNT(*)::int as count FROM feedback');
      expect(typeof count.count).toBe('number');
      // Table exists and is accessible (count can be 0 if no seed data)
    });

    it('should maintain referential integrity in data', async () => {
      // Check that all topics reference valid courses
      const invalidTopics = await db.any(`
        SELECT t.id 
        FROM topics t 
        LEFT JOIN courses c ON t.course_id = c.id 
        WHERE c.id IS NULL
      `);
      expect(invalidTopics.length).toBe(0);

      // Check that all modules reference valid topics
      const invalidModules = await db.any(`
        SELECT m.id 
        FROM modules m 
        LEFT JOIN topics t ON m.topic_id = t.id 
        WHERE t.id IS NULL
      `);
      expect(invalidModules.length).toBe(0);
      
      // Check that all lessons reference valid modules
      const invalidLessons = await db.any(`
        SELECT l.id 
        FROM lessons l 
        LEFT JOIN modules m ON l.module_id = m.id 
        WHERE m.id IS NULL
      `);
      expect(invalidLessons.length).toBe(0);
      
      // Check that all lessons reference valid topics
      const invalidLessonsTopics = await db.any(`
        SELECT l.id 
        FROM lessons l 
        LEFT JOIN topics t ON l.topic_id = t.id 
        WHERE t.id IS NULL
      `);
      expect(invalidLessonsTopics.length).toBe(0);

      // Check that all registrations reference valid courses
      const invalidRegistrations = await db.any(`
        SELECT r.id 
        FROM registrations r 
        LEFT JOIN courses c ON r.course_id = c.id 
        WHERE c.id IS NULL
      `);
      expect(invalidRegistrations.length).toBe(0);
      
      // Check that all feedback references valid courses
      const invalidFeedback = await db.any(`
        SELECT f.id 
        FROM feedback f 
        LEFT JOIN courses c ON f.course_id = c.id 
        WHERE c.id IS NULL
      `);
      expect(invalidFeedback.length).toBe(0);
      
      // Check that all assessments reference valid courses
      const invalidAssessments = await db.any(`
        SELECT a.id 
        FROM assessments a 
        LEFT JOIN courses c ON a.course_id = c.id 
        WHERE c.id IS NULL
      `);
      expect(invalidAssessments.length).toBe(0);
      
      // Exercises table removed - exercises come from Content Studio as lessons.devlab_exercises (JSONB array)
    });
  });

  describe('Indexes', () => {
    it('should have indexes on foreign key columns', async () => {
      const indexes = await db.any(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
          AND tablename IN ('courses', 'modules', 'topics', 'lessons', 'registrations', 'feedback', 'assessments', 'versions')
          AND indexname LIKE 'idx_%'
      `);
      expect(indexes.length).toBeGreaterThan(0);
    });
  });
});

