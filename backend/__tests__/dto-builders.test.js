/**
 * DTO Builders Integration Tests
 * Tests that DTO builders match schema requirements and build correct payloads
 */

import assessmentDTO from '../dtoBuilders/assessmentDTO.js';
import directoryDTO from '../dtoBuilders/directoryDTO.js';
import learningAnalyticsDTO from '../dtoBuilders/learningAnalyticsDTO.js';
import managementReportingDTO from '../dtoBuilders/managementReportingDTO.js';

describe('DTO Builders Integration Tests', () => {
  describe('assessmentDTO', () => {
    it('should build coverage_map dynamically from lessons (not stored)', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course'
      };
      
      const mockLessons = [
        {
          id: 'lesson-1',
          skills: ['JavaScript', 'React']
        },
        {
          id: 'lesson-2',
          skills: ['Node.js', 'Express']
        },
        {
          id: 'lesson-3',
          skills: ['JavaScript'] // Duplicate skill
        }
      ];
      
      const payload = assessmentDTO.buildSendPayload(
        mockCourse,
        'learner-123',
        'Test Learner',
        mockLessons
      );
      
      // Verify payload structure
      expect(payload).toHaveProperty('learner_id');
      expect(payload).toHaveProperty('learner_name');
      expect(payload).toHaveProperty('course_id');
      expect(payload).toHaveProperty('course_name');
      expect(payload).toHaveProperty('coverage_map');
      
      // ⚠️ CRITICAL: coverage_map must be built from lessons dynamically
      expect(Array.isArray(payload.coverage_map)).toBe(true);
      expect(payload.coverage_map.length).toBe(3);
      
      // Verify coverage_map structure
      payload.coverage_map.forEach(item => {
        expect(item).toHaveProperty('lesson_id');
        expect(item).toHaveProperty('skills');
        expect(Array.isArray(item.skills)).toBe(true);
      });
      
      // Verify all lessons are in coverage_map
      const lessonIds = payload.coverage_map.map(item => item.lesson_id);
      expect(lessonIds).toContain('lesson-1');
      expect(lessonIds).toContain('lesson-2');
      expect(lessonIds).toContain('lesson-3');
      
      // Verify skills from lessons
      const lesson1Map = payload.coverage_map.find(item => item.lesson_id === 'lesson-1');
      expect(lesson1Map.skills).toEqual(['JavaScript', 'React']);
      
      const lesson2Map = payload.coverage_map.find(item => item.lesson_id === 'lesson-2');
      expect(lesson2Map.skills).toEqual(['Node.js', 'Express']);
    });

    it('should handle empty lessons array', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course'
      };
      
      const payload = assessmentDTO.buildSendPayload(
        mockCourse,
        'learner-123',
        'Test Learner',
        []
      );
      
      expect(payload.coverage_map).toEqual([]);
    });

    it('should validate send payload', () => {
      const validPayload = {
        learner_id: 'learner-123',
        course_id: 'course-123',
        course_name: 'Test Course',
        coverage_map: [
          { lesson_id: 'lesson-1', skills: ['JavaScript'] }
        ]
      };
      
      expect(assessmentDTO.validateSendPayload(validPayload)).toBe(true);
      
      const invalidPayload = {
        learner_id: 'learner-123',
        course_id: 'course-123'
        // Missing coverage_map
      };
      
      expect(assessmentDTO.validateSendPayload(invalidPayload)).toBe(false);
    });
  });

  describe('directoryDTO', () => {
    it('should lookup course_name from course entity (not stored in feedback)', () => {
      const mockFeedback = {
        id: 'feedback-123',
        learner_id: 'learner-123',
        rating: 5,
        comment: 'Great course!',
        submitted_at: new Date('2025-01-01')
      };
      
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course' // Looked up from courses table
      };
      
      const payload = directoryDTO.buildSendPayload(mockFeedback, mockCourse);
      
      // Verify payload structure
      expect(payload).toHaveProperty('feedback');
      expect(payload).toHaveProperty('course_id');
      expect(payload).toHaveProperty('course_name');
      expect(payload).toHaveProperty('learner_id');
      
      // ⚠️ CRITICAL: course_name must be looked up from course entity
      expect(payload.course_name).toBe('Test Course');
      expect(payload.course_id).toBe('course-123');
      
      // Verify feedback structure
      expect(payload.feedback).toHaveProperty('rating');
      expect(payload.feedback).toHaveProperty('comment');
      expect(payload.feedback).toHaveProperty('submitted_at');
      expect(payload.feedback.rating).toBe(5);
    });

    it('should throw error if course is missing', () => {
      const mockFeedback = {
        id: 'feedback-123',
        learner_id: 'learner-123',
        rating: 5
      };
      
      expect(() => {
        directoryDTO.buildSendPayload(mockFeedback, null);
      }).toThrow('Course is required to lookup course_name');
    });

    it('should validate send payload', () => {
      const validPayload = {
        feedback: {
          rating: 5,
          comment: 'Great!',
          submitted_at: new Date().toISOString()
        },
        course_id: 'course-123',
        course_name: 'Test Course',
        learner_id: 'learner-123'
      };
      
      expect(directoryDTO.validateSendPayload(validPayload)).toBe(true);
    });
  });

  describe('learningAnalyticsDTO', () => {
    it('should aggregate skills from lessons only (not topics)', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course',
        course_type: 'trainer',
        status: 'active',
        level: 'beginner',
        duration_hours: 10,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // ⚠️ Topics are structural only - no skills
      const mockTopics = [
        {
          id: 'topic-1',
          topic_name: 'Topic 1'
          // No skills field - topics are structural only
        },
        {
          id: 'topic-2',
          topic_name: 'Topic 2'
        }
      ];
      
      // ⚠️ Lessons contain ALL skills
      const mockLessons = [
        {
          id: 'lesson-1',
          skills: ['JavaScript', 'React'],
          topic_id: 'topic-1'
        },
        {
          id: 'lesson-2',
          skills: ['Node.js', 'Express'],
          topic_id: 'topic-1'
        },
        {
          id: 'lesson-3',
          skills: ['JavaScript', 'TypeScript'], // Duplicate skill
          topic_id: 'topic-2'
        }
      ];
      
      const mockRegistrations = [
        { id: 'reg-1', status: 'in_progress' },
        { id: 'reg-2', status: 'completed' }
      ];
      
      const mockFeedback = [
        { learner_id: 'learner-1', rating: 5 }
      ];
      
      const mockAssessments = [
        { learner_id: 'learner-1', passed: true, final_grade: 85 }
      ];
      
      const payload = learningAnalyticsDTO.buildFromCourseData(
        mockCourse,
        mockTopics,
        mockLessons,
        mockRegistrations,
        mockFeedback,
        mockAssessments
      );
      
      // Verify payload structure
      expect(payload).toHaveProperty('course_id');
      expect(payload).toHaveProperty('course_name');
      expect(payload).toHaveProperty('structure');
      
      // ⚠️ CRITICAL: Skills aggregated from lessons only (not topics)
      expect(payload.structure).toHaveProperty('skills');
      expect(Array.isArray(payload.structure.skills)).toBe(true);
      
      // Verify unique skills from lessons
      const expectedSkills = ['JavaScript', 'React', 'Node.js', 'Express', 'TypeScript'];
      expect(payload.structure.skills.sort()).toEqual(expectedSkills.sort());
      
      // Verify topics are structural only
      // ⚠️ Note: Topics may have a skills field in the schema (empty array), but they are structural only
      // Skills are ONLY stored at Lesson level and aggregated dynamically
      expect(payload.structure.topics).toHaveLength(2);
      payload.structure.topics.forEach(topic => {
        expect(topic).toHaveProperty('topic_id');
        expect(topic).toHaveProperty('topic_name');
        // Topics are structural only - they do NOT have skills field (removed from schema)
        expect(topic).not.toHaveProperty('skills');
      });
      
      // Verify enrollment data
      expect(payload.enrollment).toHaveProperty('total_enrollments');
      expect(payload.enrollment.total_enrollments).toBe(2);
      expect(payload.enrollment.active_enrollments).toBe(1);
      expect(payload.enrollment.completed_enrollments).toBe(1);
      
      // Verify feedback data
      expect(payload.feedback).toHaveProperty('total_feedback');
      expect(payload.feedback.total_feedback).toBe(1);
      expect(payload.feedback.average_rating).toBe(5);
      
      // Verify assessment data
      expect(payload.assessments).toHaveProperty('total_assessments');
      expect(payload.assessments.total_assessments).toBe(1);
      expect(payload.assessments.passed_count).toBe(1);
    });

    it('should validate send payload', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course'
      };
      
      const payload = learningAnalyticsDTO.buildSendPayload(mockCourse);
      
      expect(learningAnalyticsDTO.validateSendPayload(payload)).toBe(true);
    });
  });

  describe('managementReportingDTO', () => {
    it('should build payload from course stats', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course',
        level: 'beginner',
        duration_hours: 10,
        created_at: new Date()
      };
      
      const mockRegistrations = [
        { id: 'reg-1', status: 'in_progress' },
        { id: 'reg-2', status: 'completed' },
        { id: 'reg-3', status: 'completed' }
      ];
      
      const mockFeedback = [
        { learner_id: 'learner-1', rating: 5 },
        { learner_id: 'learner-2', rating: 4 }
      ];
      
      const payload = managementReportingDTO.buildFromCourseStats(
        mockCourse,
        mockRegistrations,
        mockFeedback
      );
      
      // Verify payload structure
      expect(payload).toHaveProperty('course_id');
      expect(payload).toHaveProperty('course_name');
      expect(payload).toHaveProperty('level');
      expect(payload).toHaveProperty('duration');
      expect(payload).toHaveProperty('totalEnrollments');
      expect(payload).toHaveProperty('activeEnrollment');
      expect(payload).toHaveProperty('completionRate');
      expect(payload).toHaveProperty('averageRating');
      expect(payload).toHaveProperty('feedback');
      
      // Verify calculated stats
      expect(payload.totalEnrollments).toBe(3);
      expect(payload.activeEnrollment).toBe(1);
      expect(payload.completionRate).toBeCloseTo(66.67, 1);
      expect(payload.averageRating).toBe(4.5);
      expect(Array.isArray(payload.feedback)).toBe(true);
      expect(payload.feedback.length).toBe(2);
    });

    it('should validate send payload', () => {
      const mockCourse = {
        id: 'course-123',
        course_name: 'Test Course'
      };
      
      const payload = managementReportingDTO.buildSendPayload(mockCourse, {
        totalEnrollments: 10,
        activeEnrollment: 5,
        completionRate: 50.0,
        averageRating: 4.5
      });
      
      expect(managementReportingDTO.validateSendPayload(payload)).toBe(true);
    });
  });
});

