import db, { pgp } from '../config/database.js';

// Jest globals are available without import in Node.js environment

describe('Database Schema Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    await db.connect();
  });

  afterAll(async () => {
    // Close database connection pool
    await pgp.end();
  });

  describe('Table Existence', () => {
    it('should have courses table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courses')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have modules table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'modules')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have topics table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'topics')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have lessons table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lessons')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have registrations table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registrations')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have feedback table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have assessments table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assessments')"
      );
      expect(result.exists).toBe(true);
    });

    it('should have versions table', async () => {
      const result = await db.oneOrNone(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'versions')"
      );
      expect(result.exists).toBe(true);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have modules.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'modules'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have topics.module_id foreign key to modules', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'topics'
            AND kcu.column_name = 'module_id'
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
          WHERE tc.table_name = 'registrations'
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
          WHERE tc.table_name = 'feedback'
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
          WHERE tc.table_name = 'assessments'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have versions.course_id foreign key to courses', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'versions'
            AND kcu.column_name = 'course_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);
      expect(result.exists).toBe(true);
    });
  });

  describe('Unique Constraints', () => {
    it('should have unique constraint on registrations (course_id, learner_id)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'registrations'
            AND constraint_name = 'registrations_unique_learner_course'
            AND constraint_type = 'UNIQUE'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have unique constraint on feedback (course_id, learner_id)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'feedback'
            AND constraint_name = 'feedback_unique_learner_course'
            AND constraint_type = 'UNIQUE'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have unique constraint on versions (course_id, version_no)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'versions'
            AND constraint_name = 'versions_unique_course_version'
            AND constraint_type = 'UNIQUE'
        )
      `);
      expect(result.exists).toBe(true);
    });
  });

  describe('Check Constraints', () => {
    it('should have rating check constraint on courses (0-5)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_name = 'courses_rating_check'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have rating check constraint on feedback (1-5)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_name = 'feedback_rating_check'
        )
      `);
      expect(result.exists).toBe(true);
    });

    it('should have progress check constraint on registrations (0-100)', async () => {
      const result = await db.oneOrNone(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.check_constraints
          WHERE constraint_name = 'registrations_progress_check'
        )
      `);
      expect(result.exists).toBe(true);
    });
  });

  describe('Seed Data Validation', () => {
    it('should load seed courses without errors', async () => {
      const count = await db.one('SELECT COUNT(*) as count FROM courses');
      expect(parseInt(count.count, 10)).toBeGreaterThan(0);
    });

    it('should load seed modules without errors', async () => {
      const count = await db.one('SELECT COUNT(*) as count FROM modules');
      expect(parseInt(count.count, 10)).toBeGreaterThan(0);
    });

    it('should load seed topics without errors', async () => {
      const count = await db.one('SELECT COUNT(*) as count FROM topics');
      expect(parseInt(count.count, 10)).toBeGreaterThan(0);
    });

    it('should load seed registrations without errors', async () => {
      const count = await db.one('SELECT COUNT(*) as count FROM registrations');
      expect(parseInt(count.count, 10)).toBeGreaterThan(0);
    });

    it('should load seed feedback without errors', async () => {
      const count = await db.one('SELECT COUNT(*) as count FROM feedback');
      expect(parseInt(count.count, 10)).toBeGreaterThan(0);
    });

    it('should maintain referential integrity in seed data', async () => {
      // Check that all modules reference valid courses
      const invalidModules = await db.any(`
        SELECT m.module_id 
        FROM modules m 
        LEFT JOIN courses c ON m.course_id = c.course_id 
        WHERE c.course_id IS NULL
      `);
      expect(invalidModules.length).toBe(0);

      // Check that all topics reference valid modules
      const invalidTopics = await db.any(`
        SELECT t.topic_id 
        FROM topics t 
        LEFT JOIN modules m ON t.module_id = m.module_id 
        WHERE m.module_id IS NULL
      `);
      expect(invalidTopics.length).toBe(0);

      // Check that all registrations reference valid courses
      const invalidRegistrations = await db.any(`
        SELECT r.registration_id 
        FROM registrations r 
        LEFT JOIN courses c ON r.course_id = c.course_id 
        WHERE c.course_id IS NULL
      `);
      expect(invalidRegistrations.length).toBe(0);
    });
  });

  describe('Indexes', () => {
    it('should have indexes on foreign key columns', async () => {
      const indexes = await db.any(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('courses', 'modules', 'topics', 'lessons', 'registrations', 'feedback', 'assessments', 'versions')
        AND indexname LIKE 'idx_%'
      `);
      expect(indexes.length).toBeGreaterThan(0);
    });
  });
});

