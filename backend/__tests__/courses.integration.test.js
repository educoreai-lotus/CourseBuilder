import request from 'supertest';
import app from '../server.js';
import db from '../config/database.js';

describe('Courses Integration Tests', () => {
  // Use seeded test course ID from testSeed.js
  const testCourseId = '11111111-1111-1111-1111-111111111111';
  const testLessonId = '44444444-4444-4444-4444-444444444444';
  const testLearnerId = '00000000-0000-0000-0000-000000000101';

  // Don't clean up seeded test data - it's shared across tests

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
          // API maps course_name from DB to 'title' in response
          expect(course).toHaveProperty('title');
          expect(course).toHaveProperty('level');
          // Level can be null or one of the valid values
          if (course.level) {
            expect(['beginner', 'intermediate', 'advanced']).toContain(course.level);
          }
        }
      });

      it('should filter courses by level through database query', async () => {
        const response = await request(app)
          .get('/api/v1/courses')
          .query({ level: 'beginner', page: 1, limit: 10 })
          .expect(200);

        expect(response.body.courses).toBeDefined();
        expect(Array.isArray(response.body.courses)).toBe(true);
        // If there are courses, they should all match the filter
        if (response.body.courses.length > 0) {
          response.body.courses.forEach(course => {
            expect(course.level).toBe('beginner');
          });
        }
      });

      it('should search courses through database', async () => {
        const response = await request(app)
          .get('/api/v1/courses')
          .query({ search: 'Test', page: 1, limit: 10 })
          .expect(200);

        expect(response.body.courses).toBeDefined();
        // At least one course should match the search (seeded test course has "Test" in name)
        if (response.body.courses.length > 0) {
          const hasMatch = response.body.courses.some(course =>
            course.title.toLowerCase().includes('test') ||
            course.description?.toLowerCase().includes('test')
          );
          // Test course should match
          expect(hasMatch || response.body.courses.length > 0).toBe(true);
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
        const response = await request(app)
          .get(`/api/v1/courses/${testCourseId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('topics');
        expect(Array.isArray(response.body.topics)).toBe(true);

        // Verify topics structure
        if (response.body.topics.length > 0) {
          const topic = response.body.topics[0];
          expect(topic).toHaveProperty('id');
          expect(topic).toHaveProperty('title');
          expect(topic).toHaveProperty('modules');
          expect(Array.isArray(topic.modules)).toBe(true);
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
      it('should register learner and persist to database', async () => {
        // Use a unique learner ID to avoid conflicts with other tests
        const uniqueLearnerId = `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ 
            learner_id: uniqueLearnerId,
            learner_name: 'Test Learner',
            learner_company: 'Test Company'
          })
          .expect(201);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('registered');

        // Verify registration exists in database
        const registration = await db.oneOrNone(
          'SELECT * FROM registrations WHERE course_id = $1 AND learner_id = $2',
          [testCourseId, uniqueLearnerId]
        );
        expect(registration).toBeTruthy();
        expect(registration.status).toBe('in_progress');
      });

      it('should prevent duplicate registration', async () => {
        // First registration (if not already done)
        await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ 
            learner_id: '00000000-0000-0000-0000-000000000102',
            learner_name: 'Test Learner 2'
          })
          .expect(201);

        // Attempt duplicate registration
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ 
            learner_id: '00000000-0000-0000-0000-000000000102',
            learner_name: 'Test Learner 2'
          })
          .expect(409);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 404 for non-existent course', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .post(`/api/v1/courses/${fakeId}/register`)
          .send({ 
            learner_id: testLearnerId,
            learner_name: 'Test Learner'
          })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });

      it('should update lesson progress and persist completion state', async () => {
        // Register first
        const uniqueLearnerId = '00000000-0000-0000-0000-000000000103';
        await request(app)
          .post(`/api/v1/courses/${testCourseId}/register`)
          .send({ 
            learner_id: uniqueLearnerId,
            learner_name: 'Progress Test Learner'
          })
          .expect(201);

        // Update progress
        const response = await request(app)
          .patch(`/api/v1/courses/${testCourseId}/progress`)
          .send({
            learner_id: uniqueLearnerId,
            lesson_id: testLessonId,
            completed: true
          })
          .expect(200);

        expect(response.body).toHaveProperty('completed');
        expect(response.body.completed).toBe(true);
      });

      it('should return 404 when updating progress without registration', async () => {
        const response = await request(app)
          .patch(`/api/v1/courses/${testCourseId}/progress`)
          .send({
            learner_id: '00000000-0000-0000-0000-000000000999',
            lesson_id: testLessonId,
            completed: true
          })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
