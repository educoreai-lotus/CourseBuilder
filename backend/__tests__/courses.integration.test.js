import request from 'supertest';
import app from '../server.js';
import db from '../config/database.js';
import { pgp } from '../config/database.js';

describe('Courses Integration Tests', () => {
  let testCourseId;
  const testLearnerId = '00000000-0000-0000-0000-000000000101';

  beforeAll(async () => {
    // Ensure database connection
    await db.connect();
  });

  afterAll(async () => {
    // Clean up test data
    if (testCourseId) {
      await db.none('DELETE FROM registrations WHERE course_id = $1', [testCourseId]);
      await db.none('DELETE FROM courses WHERE course_id = $1', [testCourseId]);
    }
    await pgp.end();
  });

  describe('Full Data Flow: Controller → Service → Database', () => {
    describe('GET /api/v1/courses', () => {
      it('should return courses from database through full stack', async () => {
        const response = await request(app)
          .get('/api/v1/courses')
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('courses');
        expect(Array.isArray(response.body.courses)).toBe(true);

        // Verify data structure matches database schema
        if (response.body.courses.length > 0) {
          const course = response.body.courses[0];
          expect(course).toHaveProperty('id');
          expect(course).toHaveProperty('title');
          expect(course).toHaveProperty('level');
          expect(['beginner', 'intermediate', 'advanced']).toContain(course.level);
        }
      });

      it('should filter courses by level through database query', async () => {
        const response = await request(app)
          .get('/api/v1/courses')
          .query({ level: 'beginner', page: 1, limit: 10 })
          .expect(200);

        expect(response.body.courses).toBeDefined();
        response.body.courses.forEach(course => {
          expect(course.level).toBe('beginner');
        });
      });

      it('should search courses through database', async () => {
        const response = await request(app)
          .get('/api/v1/courses')
          .query({ search: 'AI', page: 1, limit: 10 })
          .expect(200);

        expect(response.body.courses).toBeDefined();
        // At least one course should match the search
        if (response.body.courses.length > 0) {
          const hasMatch = response.body.courses.some(course =>
            course.title.toLowerCase().includes('ai') ||
            course.description?.toLowerCase().includes('ai')
          );
          expect(hasMatch).toBe(true);
        }
      });

      it('should paginate results correctly', async () => {
        const page1 = await request(app)
          .get('/api/v1/courses')
          .query({ page: 1, limit: 2 })
          .expect(200);

        const page2 = await request(app)
          .get('/api/v1/courses')
          .query({ page: 2, limit: 2 })
          .expect(200);

        expect(page1.body.page).toBe(1);
        expect(page2.body.page).toBe(2);
        // Courses should be different (if there are enough courses)
        if (page1.body.courses.length > 0 && page2.body.courses.length > 0) {
          expect(page1.body.courses[0].id).not.toBe(page2.body.courses[0].id);
        }
      });
    });

    describe('GET /api/v1/courses/:id', () => {
      it('should return course details with modules and lessons from database', async () => {
        // Use a seed course ID
        const courseId = '11111111-1111-1111-1111-111111111111';

        const response = await request(app)
          .get(`/api/v1/courses/${courseId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('modules');
        expect(Array.isArray(response.body.modules)).toBe(true);

        // Verify modules structure
        if (response.body.modules.length > 0) {
          const module = response.body.modules[0];
          expect(module).toHaveProperty('id');
          expect(module).toHaveProperty('title');
          expect(module).toHaveProperty('order');
          expect(module).toHaveProperty('lessons');
          expect(Array.isArray(module.lessons)).toBe(true);
        }
      });

      it('should return 404 for non-existent course', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .get(`/api/v1/courses/${fakeId}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toBe('Course not found');
      });
    });

    describe('POST /api/v1/courses/:id/register', () => {
      beforeEach(async () => {
        // Create a test course
        testCourseId = await db.one(
          `INSERT INTO courses (course_id, course_name, course_description, level, visibility, status)
           VALUES (uuid_generate_v4(), 'Test Course', 'Test Description', 'beginner', 'public', 'live')
           RETURNING course_id`
        );
        testCourseId = testCourseId.course_id;
      });

      it('should register learner and persist to database', async () => {
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ learner_id: testLearnerId })
          .expect(201);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('registered');
        expect(response.body.course_id).toBe(testCourseId);
        expect(response.body.learner_id).toBe(testLearnerId);

        // Verify registration exists in database
        const registration = await db.oneOrNone(
          'SELECT * FROM registrations WHERE course_id = $1 AND learner_id = $2',
          [testCourseId, testLearnerId]
        );
        expect(registration).toBeTruthy();
        expect(registration.status).toBe('in_progress');
        expect(parseFloat(registration.progress)).toBe(0);

        // Verify course enrollment count updated
        const course = await db.one(
          'SELECT total_enrollments, active_enrollments FROM courses WHERE course_id = $1',
          [testCourseId]
        );
        expect(parseInt(course.total_enrollments)).toBeGreaterThan(0);
        expect(parseInt(course.active_enrollments)).toBeGreaterThan(0);
      });

      it('should prevent duplicate registration', async () => {
        // First registration
        await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ learner_id: testLearnerId })
          .expect(201);

        // Attempt duplicate registration
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ learner_id: testLearnerId })
          .expect(409);

        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toContain('already registered');
      });

      it('should return 404 for non-existent course', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .post(`/api/v1/courses/${fakeId}/register`)
          .send({ learner_id: testLearnerId })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});


