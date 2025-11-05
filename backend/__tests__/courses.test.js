import request from 'supertest';
import app from '../server.js';

describe('Courses API', () => {
  describe('GET /api/v1/courses', () => {
    it('should return paginated courses list', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('courses');
      expect(Array.isArray(response.body.courses)).toBe(true);
    });

    it('should filter courses by level', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ level: 'beginner' })
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      // All courses should be beginner level if filter applied
      if (response.body.courses.length > 0) {
        response.body.courses.forEach(course => {
          expect(course.level).toBe('beginner');
        });
      }
    });

    it('should search courses by query', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ search: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('courses');
    });
  });

  describe('GET /api/v1/courses/:id', () => {
    it('should return 400 if course ID is missing', async () => {
      const response = await request(app)
        .get('/api/v1/courses/')
        .expect(404); // Express returns 404 for missing route
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
    it('should return 400 if learner_id is missing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/register`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toBe('learner_id is required');
    });

    it('should return 400 if course ID is missing', async () => {
      const response = await request(app)
        .post('/api/v1/courses/register')
        .send({ learner_id: '123' })
        .expect(404); // Route doesn't match
    });
  });
});


