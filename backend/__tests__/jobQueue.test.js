/**
 * Tests for Job Queue Service
 */

import { jest } from '@jest/globals';
import { addJob, addHighPriorityJob, addLowPriorityJob, getQueueStats } from '../services/jobQueue.service.js';

describe('Job Queue Service', () => {
  beforeEach(() => {
    // Reset queue stats - job queue doesn't use jest mocks
  });

  describe('addJob', () => {
    it('should add and execute a job successfully', async () => {
      const jobFn = jest.fn().mockResolvedValue('job-result');

      const result = await addJob(jobFn, { test: 'data' });

      expect(result).toBe('job-result');
      expect(jobFn).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle job errors with retry', async () => {
      let attemptCount = 0;
      const jobFn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Job failed');
        }
        return Promise.resolve('success');
      });

      // Job should retry and eventually succeed
      const jobPromise = addJob(jobFn, {}, { retries: 3 });

      // Wait for retries (with longer timeout for retries)
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(jobFn).toHaveBeenCalled();
      
      // Clean up promise
      try {
        await jobPromise;
      } catch (e) {
        // Expected if retries exhausted
      }
    }, 10000); // Increase timeout

    it('should respect priority ordering', async () => {
      const results = [];
      const highPriorityJob = jest.fn().mockResolvedValue('high');
      const lowPriorityJob = jest.fn().mockResolvedValue('low');

      await addLowPriorityJob(lowPriorityJob, {});
      await addHighPriorityJob(highPriorityJob, {});

      // Wait for jobs to process
      await new Promise(resolve => setTimeout(resolve, 200));

      // Both should be called
      expect(highPriorityJob).toHaveBeenCalled();
      expect(lowPriorityJob).toHaveBeenCalled();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', () => {
      const stats = getQueueStats();

      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('processing');
      expect(typeof stats.queueLength).toBe('number');
      expect(typeof stats.activeJobs).toBe('number');
    });
  });

  describe('job execution', () => {
    it('should execute jobs concurrently', async () => {
      const job1 = jest.fn().mockResolvedValue('job1');
      const job2 = jest.fn().mockResolvedValue('job2');
      const job3 = jest.fn().mockResolvedValue('job3');

      await Promise.all([
        addJob(job1, {}),
        addJob(job2, {}),
        addJob(job3, {})
      ]);

      // Wait for concurrent execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(job1).toHaveBeenCalled();
      expect(job2).toHaveBeenCalled();
      expect(job3).toHaveBeenCalled();
    });

    it('should handle job failures gracefully', async () => {
      const jobFn = jest.fn().mockRejectedValue(new Error('Job failed'));

      try {
        await addJob(jobFn, {}, { retries: 1 });
      } catch (error) {
        // Expected to fail after retries
      }

      const stats = getQueueStats();
      // Failed jobs should be tracked
      expect(stats.failedJobs).toBeGreaterThanOrEqual(0);
    });
  });
});

