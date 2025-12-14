/**
 * Pending Course Creation Error
 * Domain-specific error for when course creation cannot complete yet
 * but is not a failure - the request is accepted and processing is pending
 */

export class PendingCourseCreationError extends Error {
  constructor(message, reason = null) {
    super(message);
    this.name = 'PendingCourseCreationError';
    this.status = 202; // HTTP 202 Accepted
    this.reason = reason || message;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PendingCourseCreationError);
    }
  }
}

export default PendingCourseCreationError;

