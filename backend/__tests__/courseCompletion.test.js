/**
 * Tests for Course Completion Service
 */

import { jest } from '@jest/globals';

describe('Course Completion Service', () => {
  describe('Module Exports', () => {
    it('should export triggerCourseCompletion function', async () => {
      const service = await import('../services/courseCompletion.service.js');
      expect(service.triggerCourseCompletion).toBeDefined();
      expect(typeof service.triggerCourseCompletion).toBe('function');
    });
  });

  describe('triggerCourseCompletion', () => {
    it('should handle errors gracefully without throwing', async () => {
      const { triggerCourseCompletion } = await import('../services/courseCompletion.service.js');
      
      // Should not throw even with invalid data
      await expect(
        triggerCourseCompletion({
          courseId: null,
          courseName: null,
          learnerId: null,
          completedAt: null
        })
      ).resolves.not.toThrow();
    });
  });
});
