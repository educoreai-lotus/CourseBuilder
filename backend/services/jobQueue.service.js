/**
 * Simple In-Memory Job Queue Service
 * Handles asynchronous tasks without external dependencies
 * Can be upgraded to BullMQ for production scale
 */

/**
 * Job queue structure
 */
class JobQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 3; // Process 3 jobs concurrently
    this.activeJobs = 0;
    this.failedJobs = [];
    this.maxRetries = 3;
  }

  /**
   * Add a job to the queue
   * @param {Function} jobFn - Async function to execute
   * @param {Object} data - Job data
   * @param {Object} options - Job options (priority, retries, etc.)
   * @returns {Promise} Job promise
   */
  async add(jobFn, data = {}, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fn: jobFn,
      data,
      priority: options.priority || 5, // 1-10, higher = more important
      retries: options.retries || this.maxRetries,
      attempts: 0,
      createdAt: new Date(),
      status: 'pending'
    };

    // Add to queue and sort by priority
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);

    console.log(`[JobQueue] Added job ${job.id} to queue (priority: ${job.priority})`);

    // Start processing if not already
    this.process();

    // Return a promise that resolves when job completes
    return new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
  }

  /**
   * Process jobs from the queue
   */
  async process() {
    if (this.processing || this.activeJobs >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const job = this.queue.shift();
      this.activeJobs++;

      this.executeJob(job).finally(() => {
        this.activeJobs--;
        // Continue processing
        if (this.queue.length > 0) {
          this.process();
        } else {
          this.processing = false;
        }
      });
    }

    this.processing = false;
  }

  /**
   * Execute a job
   * @param {Object} job - Job to execute
   */
  async executeJob(job) {
    try {
      job.status = 'processing';
      job.attempts++;
      console.log(`[JobQueue] Executing job ${job.id} (attempt ${job.attempts})`);

      const result = await job.fn(job.data);
      
      job.status = 'completed';
      console.log(`[JobQueue] Job ${job.id} completed successfully`);

      if (job.resolve) {
        job.resolve(result);
      }
    } catch (error) {
      console.error(`[JobQueue] Job ${job.id} failed:`, error.message);

      if (job.attempts < job.retries) {
        // Retry job
        job.status = 'retrying';
        console.log(`[JobQueue] Retrying job ${job.id} (${job.attempts}/${job.retries})`);
        
        // Exponential backoff: wait 2^attempts seconds
        const delay = Math.pow(2, job.attempts) * 1000;
        setTimeout(() => {
          this.queue.push(job);
          this.queue.sort((a, b) => b.priority - a.priority);
          this.process();
        }, delay);
      } else {
        // Job failed permanently
        job.status = 'failed';
        job.error = error.message;
        this.failedJobs.push(job);
        console.error(`[JobQueue] Job ${job.id} failed permanently after ${job.attempts} attempts`);

        if (job.reject) {
          job.reject(error);
        }
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      failedJobs: this.failedJobs.length,
      processing: this.processing
    };
  }

  /**
   * Clear failed jobs
   */
  clearFailed() {
    this.failedJobs = [];
  }
}

// Singleton instance
const jobQueue = new JobQueue();

/**
 * Add a job to the queue
 * @param {Function} jobFn - Async function to execute
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 */
export const addJob = async (jobFn, data = {}, options = {}) => {
  return jobQueue.add(jobFn, data, options);
};

/**
 * Add a high-priority job
 */
export const addHighPriorityJob = async (jobFn, data = {}, options = {}) => {
  return jobQueue.add(jobFn, data, { ...options, priority: 10 });
};

/**
 * Add a low-priority job
 */
export const addLowPriorityJob = async (jobFn, data = {}, options = {}) => {
  return jobQueue.add(jobFn, data, { ...options, priority: 1 });
};

/**
 * Get queue statistics
 */
export const getQueueStats = () => {
  return jobQueue.getStats();
};

export default {
  addJob,
  addHighPriorityJob,
  addLowPriorityJob,
  getQueueStats,
  queue: jobQueue
};

