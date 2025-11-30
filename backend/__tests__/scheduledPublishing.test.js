/**
 * Tests for Scheduled Publishing Service
 */

import { jest } from '@jest/globals';

describe('Scheduled Publishing Service', () => {
  let originalSetInterval;
  let originalClearInterval;
  let intervalIds = [];

  beforeAll(() => {
    // Mock setInterval to track and clear intervals
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;

    global.setInterval = jest.fn((fn, delay) => {
      const id = originalSetInterval(() => {
        // Don't actually run the function in tests
      }, delay);
      intervalIds.push(id);
      return id;
    });

    global.clearInterval = jest.fn((id) => {
      intervalIds = intervalIds.filter(i => i !== id);
      originalClearInterval(id);
    });
  });

  afterAll(() => {
    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    // Clean up any remaining intervals
    intervalIds.forEach(id => originalClearInterval(id));
    intervalIds = [];
  });

  describe('Module Exports', () => {
    it('should export findScheduledCourses function', async () => {
      const service = await import('../services/scheduledPublishing.service.js');
      expect(service.findScheduledCourses).toBeDefined();
      expect(typeof service.findScheduledCourses).toBe('function');
    });

    it('should export processScheduledPublications function', async () => {
      const service = await import('../services/scheduledPublishing.service.js');
      expect(service.processScheduledPublications).toBeDefined();
      expect(typeof service.processScheduledPublications).toBe('function');
    });

    it('should export startScheduledPublishingJob function', async () => {
      const service = await import('../services/scheduledPublishing.service.js');
      expect(service.startScheduledPublishingJob).toBeDefined();
      expect(typeof service.startScheduledPublishingJob).toBe('function');
    });
  });

  describe('startScheduledPublishingJob', () => {
    it('should return cleanup function', async () => {
      const { startScheduledPublishingJob } = await import('../services/scheduledPublishing.service.js');
      
      // Start job - will set up interval
      const cleanup = startScheduledPublishingJob();
      
      expect(typeof cleanup).toBe('function');
      expect(global.setInterval).toHaveBeenCalled();
      
      // Clean up
      cleanup();
      expect(global.clearInterval).toHaveBeenCalled();
    });
  });
});
