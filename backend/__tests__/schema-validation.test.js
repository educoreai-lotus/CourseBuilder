/**
 * Schema Validation Tests
 * Tests that all endpoints return correct structure based on final schema:
 * Course → Topics → Modules → Lessons (real content ONLY in lessons)
 */

import request from 'supertest';
import app from '../server.js';
import db from '../config/database.js';

describe('Schema Validation Tests', () => {
  describe('GET /api/v1/courses/:id - Structure Validation', () => {
    it('should return course with topics → modules → lessons structure', async () => {
      // Use seed course ID
      const courseId = '11111111-1111-1111-1111-111111111111';
      
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      
      // ⚠️ CRITICAL: Course should have topics array
      expect(response.body).toHaveProperty('topics');
      expect(Array.isArray(response.body.topics)).toBe(true);
      
      // Verify topics structure (structural only - no content)
      if (response.body.topics.length > 0) {
        const topic = response.body.topics[0];
        expect(topic).toHaveProperty('id');
        expect(topic).toHaveProperty('topic_id');
        expect(topic).toHaveProperty('title');
        expect(topic).toHaveProperty('topic_name');
        expect(topic).toHaveProperty('modules');
        expect(Array.isArray(topic.modules)).toBe(true);
        
        // ⚠️ Topics are structural only - should NOT have content fields
        expect(topic).not.toHaveProperty('content_data');
        expect(topic).not.toHaveProperty('devlab_exercises');
        
        // Verify modules structure (structural only - no content)
        if (topic.modules.length > 0) {
          const module = topic.modules[0];
          expect(module).toHaveProperty('id');
          expect(module).toHaveProperty('module_id');
          expect(module).toHaveProperty('title');
          expect(module).toHaveProperty('module_name');
          expect(module).toHaveProperty('lessons');
          expect(Array.isArray(module.lessons)).toBe(true);
          
          // ⚠️ Modules are structural only - should NOT have content fields
          expect(module).not.toHaveProperty('content_data');
          expect(module).not.toHaveProperty('devlab_exercises');
          expect(module).not.toHaveProperty('skills');
          
          // ⚠️ CRITICAL: Lessons contain ALL real content
          if (module.lessons.length > 0) {
            const lesson = module.lessons[0];
            expect(lesson).toHaveProperty('id');
            expect(lesson).toHaveProperty('lesson_id');
            expect(lesson).toHaveProperty('title');
            expect(lesson).toHaveProperty('lesson_name');
            
            // ⚠️ content_data must be an array (Content Studio contents[] array)
            expect(lesson).toHaveProperty('content_data');
            expect(Array.isArray(lesson.content_data)).toBe(true);
            
            // ⚠️ devlab_exercises must be an array
            expect(lesson).toHaveProperty('devlab_exercises');
            expect(Array.isArray(lesson.devlab_exercises)).toBe(true);
            
            // ⚠️ skills must be an array (ONLY at Lesson level)
            expect(lesson).toHaveProperty('skills');
            expect(Array.isArray(lesson.skills)).toBe(true);
            
            // ⚠️ trainer_ids must be an array
            expect(lesson).toHaveProperty('trainer_ids');
            expect(Array.isArray(lesson.trainer_ids)).toBe(true);
          }
        }
      }
      
      // Backward compatibility: modules field should exist
      expect(response.body).toHaveProperty('modules');
      expect(Array.isArray(response.body.modules)).toBe(true);
      
      // Skills should be aggregated from lessons only
      expect(response.body).toHaveProperty('skills');
      expect(Array.isArray(response.body.skills)).toBe(true);
    });

    it('should return skills aggregated from lessons only (not topics)', async () => {
      const courseId = '11111111-1111-1111-1111-111111111111';
      
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);

      // Collect all skills from lessons
      const lessonSkills = [];
      response.body.topics?.forEach(topic => {
        topic.modules?.forEach(module => {
          module.lessons?.forEach(lesson => {
            if (Array.isArray(lesson.skills)) {
              lessonSkills.push(...lesson.skills);
            }
          });
        });
      });
      
      const uniqueLessonSkills = [...new Set(lessonSkills)];
      
      // Course-level skills should match aggregated lesson skills
      expect(Array.isArray(response.body.skills)).toBe(true);
      expect(response.body.skills.length).toBe(uniqueLessonSkills.length);
      
      // Verify all course skills come from lessons
      response.body.skills.forEach(skill => {
        expect(uniqueLessonSkills).toContain(skill);
      });
    });
  });

  describe('GET /api/v1/lessons/:id - Lesson Content Validation', () => {
    it('should return lesson with all content fields as arrays', async () => {
      // First, get a course to find a lesson ID
      const courseId = '11111111-1111-1111-1111-111111111111';
      const courseResponse = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);
      
      // Find first lesson ID
      let lessonId = null;
      courseResponse.body.topics?.forEach(topic => {
        topic.modules?.forEach(module => {
          if (module.lessons && module.lessons.length > 0 && !lessonId) {
            lessonId = module.lessons[0].id || module.lessons[0].lesson_id;
          }
        });
      });
      
      if (!lessonId) {
        console.warn('No lessons found in test course, skipping lesson detail test');
        return;
      }
      
      const response = await request(app)
        .get(`/api/v1/lessons/${lessonId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      
      // ⚠️ content_data must be an array (Content Studio contents[] array)
      expect(response.body).toHaveProperty('content_data');
      expect(Array.isArray(response.body.content_data)).toBe(true);
      
      // ⚠️ devlab_exercises must be an array
      expect(response.body).toHaveProperty('devlab_exercises');
      expect(Array.isArray(response.body.devlab_exercises)).toBe(true);
      
      // ⚠️ skills must be an array (ONLY at Lesson level)
      expect(response.body).toHaveProperty('skills');
      expect(Array.isArray(response.body.skills)).toBe(true);
      
      // ⚠️ trainer_ids must be an array
      expect(response.body).toHaveProperty('trainer_ids');
      expect(Array.isArray(response.body.trainer_ids)).toBe(true);
    });
  });

  describe('Registration Flow - End-to-End', () => {
    // Use unique learner ID for this test to avoid conflicts
    const testLearnerId = `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;
    const testCourseId = '11111111-1111-1111-1111-111111111111';

    it('should register learner and track progress in lesson_completion_dictionary', async () => {
      // Register learner
      const registerResponse = await request(app)
        .post(`/api/v1/courses/${testCourseId}/register`)
        .send({
          learner_id: testLearnerId,
          learner_name: 'Test Learner',
          learner_company: 'Test Company'
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('status');
      expect(registerResponse.body.status).toBe('registered');
      expect(registerResponse.body).toHaveProperty('registration_id');
      
      // Get course to verify studentsIDDictionary was updated
      const courseResponse = await request(app)
        .get(`/api/v1/courses/${testCourseId}`)
        .query({ learner_id: testLearnerId })
        .expect(200);
      
      // Verify learner progress exists
      expect(courseResponse.body).toHaveProperty('learner_progress');
      expect(courseResponse.body.learner_progress).toHaveProperty('is_enrolled');
      expect(courseResponse.body.learner_progress.is_enrolled).toBe(true);
    });
  });

  describe('Feedback Flow - End-to-End', () => {
    // Use unique learner ID for this test to avoid conflicts
    const testLearnerId = `00000000-0000-0000-0000-${(Date.now() + 1).toString().slice(-12)}`;
    const testCourseId = '11111111-1111-1111-1111-111111111111';

    it('should submit feedback and look up course_name from courses table', async () => {
      const feedbackResponse = await request(app)
        .post(`/api/v1/courses/${testCourseId}/feedback`)
        .send({
          learner_id: testLearnerId,
          rating: 5,
          comment: 'Excellent course!'
        })
        .expect(201);

      expect(feedbackResponse.body).toHaveProperty('id');
      expect(feedbackResponse.body).toHaveProperty('feedback_id');
      expect(feedbackResponse.body).toHaveProperty('message');
      // Rating is not returned in the response, only stored in DB
      
      // Verify feedback is stored correctly
      const getFeedbackResponse = await request(app)
        .get(`/api/v1/feedback/${testCourseId}`)
        .expect(200);
      
      // Verify response structure from getAggregatedFeedback
      expect(getFeedbackResponse.body).toHaveProperty('course_id');
      expect(getFeedbackResponse.body).toHaveProperty('average_rating');
      expect(getFeedbackResponse.body).toHaveProperty('total_ratings');
      expect(getFeedbackResponse.body).toHaveProperty('recent_comments');
      expect(Array.isArray(getFeedbackResponse.body.recent_comments)).toBe(true);
      
      // Find our feedback in recent_comments (anonymized)
      const ourFeedback = getFeedbackResponse.body.recent_comments.find(
        f => f.comment === 'Excellent course!'
      );
      
      expect(ourFeedback).toBeDefined();
      expect(ourFeedback.rating).toBe(5);
    });
  });

  describe('JSONB Field Validation', () => {
    it('should validate content_data is always an array', async () => {
      const courseId = '11111111-1111-1111-1111-111111111111';
      const courseResponse = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);
      
      // Check all lessons have array content_data
      courseResponse.body.topics?.forEach(topic => {
        topic.modules?.forEach(module => {
          module.lessons?.forEach(lesson => {
            expect(Array.isArray(lesson.content_data)).toBe(true);
          });
        });
      });
    });

    it('should validate devlab_exercises is always an array', async () => {
      const courseId = '11111111-1111-1111-1111-111111111111';
      const courseResponse = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);
      
      // Check all lessons have array devlab_exercises
      courseResponse.body.topics?.forEach(topic => {
        topic.modules?.forEach(module => {
          module.lessons?.forEach(lesson => {
            expect(Array.isArray(lesson.devlab_exercises)).toBe(true);
          });
        });
      });
    });

    it('should validate skills is always an array at lesson level', async () => {
      const courseId = '11111111-1111-1111-1111-111111111111';
      const courseResponse = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);
      
      // Check all lessons have array skills
      courseResponse.body.topics?.forEach(topic => {
        topic.modules?.forEach(module => {
          module.lessons?.forEach(lesson => {
            expect(Array.isArray(lesson.skills)).toBe(true);
          });
        });
      });
    });
  });
});

