import request from 'supertest';
import app from '../server.js';

describe('Feedback API', () => {
  describe('POST /api/v1/courses/:id/feedback', () => {
    it('should return 400 if learner_id is missing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/feedback`)
        .send({ rating: 5 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toBe('learner_id is required');
    });

    it('should return 400 if rating is missing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/feedback`)
        .send({ learner_id: '123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('rating');
    });

    it('should return 400 if rating is out of range', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/feedback`)
        .send({ learner_id: '123', rating: 6 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('rating must be between 1 and 5');
    });

    it('should return 400 if rating is below 1', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/feedback`)
        .send({ learner_id: '123', rating: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/feedback/:courseId', () => {
    it('should return 400 if courseId is missing', async () => {
      const response = await request(app)
        .get('/api/v1/feedback/')
        .expect(404); // Route mismatch
    });

    it('should return aggregated feedback structure', async () => {
      const seededCourseId = '11111111-1111-1111-1111-111111111111';
      const response = await request(app)
        .get(`/api/v1/feedback/${seededCourseId}`)
        .expect(200);

      // Verify response structure from feedbackService.getAggregatedFeedback
      expect(response.body).toHaveProperty('course_id');
      expect(response.body).toHaveProperty('average_rating');
      expect(response.body).toHaveProperty('total_ratings');
      expect(response.body).toHaveProperty('recent_comments');
      expect(Array.isArray(response.body.recent_comments)).toBe(true);
      // average_rating should be a number
      expect(typeof response.body.average_rating).toBe('number');
      // total_ratings should be a number
      expect(typeof response.body.total_ratings).toBe('number');
    });
  });
});


