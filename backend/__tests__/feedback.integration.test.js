import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../server.js';
import db from '../config/database.js';

describe('Feedback Integration Tests', () => {
  // Use seeded test course ID from testSeed.js
  const testCourseId = '11111111-1111-1111-1111-111111111111';
  const testLearnerId = '00000000-0000-0000-0000-000000000201';
  let testFeedbackId;

  afterAll(async () => {
    // Clean up test data - only delete feedback we created
    if (testFeedbackId) {
      await db.none('DELETE FROM feedback WHERE id = $1', [testFeedbackId]);
    }
    // Don't delete test courses - they're seeded for all tests
  });

  describe('Full Data Flow: Controller → Service → Database', () => {
    describe('POST /api/v1/courses/:id/feedback', () => {
      it('should submit feedback and persist to database', async () => {
        const feedbackData = {
          learner_id: testLearnerId,
          rating: 5,
          comment: 'Excellent course!'
        };

        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send(feedbackData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        testFeedbackId = response.body.id;

        // Verify feedback exists in database
        const feedback = await db.oneOrNone(
          'SELECT * FROM feedback WHERE id = $1',
          [testFeedbackId]
        );
        expect(feedback).toBeTruthy();
        expect(parseFloat(feedback.rating)).toBe(5);
        expect(feedback.comment).toBe('Excellent course!');
        expect(feedback.course_id).toBe(testCourseId);
        expect(feedback.learner_id).toBe(testLearnerId);
      });

      it('should enforce 1-5 rating validation', async () => {
        const invalidRatings = [0, 6, -1];

        for (const rating of invalidRatings) {
          const response = await request(app)
            .post(`/api/v1/courses/${testCourseId}/feedback`)
            .send({
              learner_id: uuidv4(),
              rating
            })
            .expect(400);

          expect(response.body).toHaveProperty('error');
        }
      });

      it('should prevent duplicate feedback submission', async () => {
        const uniqueLearnerId = '00000000-0000-0000-0000-000000000202';
        
        // First submission
        await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send({
            learner_id: uniqueLearnerId,
            rating: 4,
            comment: 'First feedback'
          })
          .expect(201);

        // Attempt duplicate submission
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send({
            learner_id: uniqueLearnerId,
            rating: 5,
            comment: 'Second feedback'
          })
          .expect(409);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 404 for non-existent course', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .post(`/api/v1/courses/${fakeId}/feedback`)
          .send({
            learner_id: testLearnerId,
            rating: 5
          })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });

      it('should require learner_id', async () => {
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send({
            rating: 5
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/feedback/:courseId', () => {
      beforeAll(async () => {
        // Add multiple feedback entries for aggregation
        const learners = [uuidv4(), uuidv4(), uuidv4()];
        for (const learnerId of learners) {
          await db.none(
            `INSERT INTO feedback (id, course_id, learner_id, rating, comment, submitted_at)
             VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
             ON CONFLICT DO NOTHING`,
            [
              testCourseId,
              learnerId,
              4, // Fixed rating
              'Automated feedback entry'
            ]
          );
        }
      });

      it('should return aggregated feedback from database', async () => {
        const response = await request(app)
          .get(`/api/v1/feedback/${testCourseId}`)
          .expect(200);

        // Verify response structure from getAggregatedFeedback
        expect(response.body).toHaveProperty('course_id');
        expect(response.body).toHaveProperty('average_rating');
        expect(response.body).toHaveProperty('total_ratings');
        expect(response.body).toHaveProperty('recent_comments');
        expect(Array.isArray(response.body.recent_comments)).toBe(true);
        expect(response.body.total_ratings).toBeGreaterThan(0);
      });

      it('should return empty stats for course with no feedback', async () => {
        // Use a different course ID that has no feedback
        const newCourseId = uuidv4();
        // Create a course (but don't add feedback)
        await db.none(
          `INSERT INTO courses (id, course_name, course_type, status)
           VALUES ($1, 'Empty Course', 'trainer', 'active')
           ON CONFLICT (id) DO NOTHING`,
          [newCourseId]
        );

        const response = await request(app)
          .get(`/api/v1/feedback/${newCourseId}`)
          .expect(200);

        // Verify response structure
        expect(response.body).toHaveProperty('course_id');
        expect(response.body).toHaveProperty('average_rating', 0);
        expect(response.body).toHaveProperty('total_ratings', 0);
        expect(response.body).toHaveProperty('recent_comments');
        expect(Array.isArray(response.body.recent_comments)).toBe(true);
        expect(response.body.recent_comments.length).toBe(0);
      });

      it('should return 404 for non-existent course', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .get(`/api/v1/feedback/${fakeId}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
