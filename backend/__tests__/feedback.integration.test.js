import request from 'supertest';
import app from '../server.js';
import db from '../config/database.js';
import { pgp } from '../config/database.js';

describe('Feedback Integration Tests', () => {
  let testCourseId;
  let testLearnerId = 'test-learner-feedback-001';
  let testFeedbackId;

  beforeAll(async () => {
    // Ensure database connection
    await db.connect();
    
    // Create a test course
    const result = await db.one(
      `INSERT INTO courses (course_id, course_name, course_description, level, visibility, status)
       VALUES (uuid_generate_v4(), 'Test Feedback Course', 'Test Description', 'beginner', 'public', 'live')
       RETURNING course_id`
    );
    testCourseId = result.course_id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testFeedbackId) {
      await db.none('DELETE FROM feedback WHERE feedback_id = $1', [testFeedbackId]);
    }
    if (testCourseId) {
      await db.none('DELETE FROM feedback WHERE course_id = $1', [testCourseId]);
      await db.none('DELETE FROM courses WHERE course_id = $1', [testCourseId]);
    }
    await pgp.end();
  });

  describe('Full Data Flow: Controller → Service → Database', () => {
    describe('POST /api/v1/courses/:id/feedback', () => {
      it('should submit feedback and persist to database', async () => {
        const feedbackData = {
          learner_id: testLearnerId,
          rating: 5,
          tags: ['Clarity', 'Usefulness'],
          comment: 'Excellent course!'
        };

        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send(feedbackData)
          .expect(201);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Feedback submitted successfully');
        expect(response.body).toHaveProperty('feedback_id');
        expect(response.body).toHaveProperty('timestamp');

        testFeedbackId = response.body.feedback_id;

        // Verify feedback exists in database
        const feedback = await db.oneOrNone(
          'SELECT * FROM feedback WHERE feedback_id = $1',
          [testFeedbackId]
        );
        expect(feedback).toBeTruthy();
        expect(parseFloat(feedback.rating)).toBe(5);
        expect(feedback.comment).toBe('Excellent course!');
        expect(feedback.course_id).toBe(testCourseId);
        expect(feedback.learner_id).toBe(testLearnerId);

        // Verify course average rating updated
        const course = await db.one(
          'SELECT average_rating FROM courses WHERE course_id = $1',
          [testCourseId]
        );
        expect(parseFloat(course.average_rating)).toBeGreaterThan(0);
      });

      it('should enforce 1-5 rating validation', async () => {
        const invalidRatings = [0, 6, -1, 'invalid', null];

        for (const rating of invalidRatings) {
          const response = await request(app)
            .post(`/api/v1/courses/${testCourseId}/feedback`)
            .send({
              learner_id: `test-learner-${Date.now()}`,
              rating: rating
            })
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.message).toContain('rating');
        }
      });

      it('should prevent duplicate feedback submission', async () => {
        // First submission
        await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send({
            learner_id: 'test-learner-duplicate',
            rating: 4,
            comment: 'First feedback'
          })
          .expect(201);

        // Attempt duplicate submission
        const response = await request(app)
          .post(`/api/v1/courses/${testCourseId}/feedback`)
          .send({
            learner_id: 'test-learner-duplicate',
            rating: 5,
            comment: 'Second feedback'
          })
          .expect(409);

        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toContain('already submitted');
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
        expect(response.body.message).toContain('learner_id');
      });
    });

    describe('GET /api/v1/feedback/:courseId', () => {
      beforeAll(async () => {
        // Add multiple feedback entries for aggregation
        const learners = ['learner-1', 'learner-2', 'learner-3'];
        for (const learnerId of learners) {
          await db.none(
            `INSERT INTO feedback (feedback_id, course_id, learner_id, rating, tags, comment, created_at)
             VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())`,
            [
              testCourseId,
              learnerId,
              4 + Math.random(), // Random rating between 4-5
              JSON.stringify(['Clarity', 'Usefulness']),
              `Feedback from ${learnerId}`
            ]
          );
        }
      });

      it('should return aggregated feedback from database', async () => {
        const response = await request(app)
          .get(`/api/v1/feedback/${testCourseId}`)
          .expect(200);

        expect(response.body).toHaveProperty('course_id');
        expect(response.body).toHaveProperty('average_rating');
        expect(response.body).toHaveProperty('total_ratings');
        expect(response.body).toHaveProperty('tags_breakdown');
        expect(response.body).toHaveProperty('recent_comments');
        expect(Array.isArray(response.body.recent_comments)).toBe(true);

        // Verify aggregated data
        expect(parseFloat(response.body.average_rating)).toBeGreaterThan(0);
        expect(parseInt(response.body.total_ratings)).toBeGreaterThan(0);
        expect(typeof response.body.tags_breakdown).toBe('object');

        // Verify comments are anonymized
        response.body.recent_comments.forEach(comment => {
          expect(comment.learner_name).toBe('Anonymous');
        });
      });

      it('should return empty stats for course with no feedback', async () => {
        // Create a course with no feedback
        const newCourse = await db.one(
          `INSERT INTO courses (course_id, course_name, course_description, level, visibility, status)
           VALUES (uuid_generate_v4(), 'Empty Course', 'No feedback', 'beginner', 'public', 'live')
           RETURNING course_id`
        );

        const response = await request(app)
          .get(`/api/v1/feedback/${newCourse.course_id}`)
          .expect(200);

        expect(response.body.average_rating).toBe(0);
        expect(response.body.total_ratings).toBe(0);
        expect(response.body.tags_breakdown).toEqual({});
        expect(response.body.recent_comments).toEqual([]);

        // Cleanup
        await db.none('DELETE FROM courses WHERE course_id = $1', [newCourse.course_id]);
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


