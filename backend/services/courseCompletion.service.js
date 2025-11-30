/**
 * Course Completion Service
 * Handles post-completion tasks: credential issuance, analytics, notifications
 */

import credentialService from './credential.service.js';
import { addJob, addHighPriorityJob } from './jobQueue.service.js';
import db from '../config/database.js';
import courseRepository from '../repositories/CourseRepository.js';
import registrationRepository from '../repositories/RegistrationRepository.js';

/**
 * Get learner information from registration
 */
async function getLearnerInfo(learnerId, courseId) {
  try {
    const registration = await registrationRepository.findByLearnerAndCourse(learnerId, courseId);
    if (!registration) {
      return null;
    }

    return {
      learnerId,
      learnerName: registration.learner_name || 'Learner',
      learnerEmail: null // TODO: Get from Directory service or user context
    };
  } catch (error) {
    console.error('[CourseCompletion] Error getting learner info:', error);
    return null;
  }
}

/**
 * Get assessment score for credential issuance
 * TODO: Get from Assessment service
 */
async function getAssessmentScore(learnerId, courseId) {
  try {
    // Check if assessment exists in database
    const assessment = await db.oneOrNone(
      'SELECT score FROM assessments WHERE learner_id = $1 AND course_id = $2 ORDER BY completed_at DESC LIMIT 1',
      [learnerId, courseId]
    );

    return assessment?.score || null;
  } catch (error) {
    console.error('[CourseCompletion] Error getting assessment score:', error);
    return null;
  }
}

/**
 * Issue credential asynchronously
 */
async function issueCredentialJob(data) {
  const { courseId, courseName, learnerId, learnerName, learnerEmail, score, completedAt } = data;

  if (!learnerEmail) {
    console.warn(`[CourseCompletion] Skipping credential for ${learnerId} - no email`);
    return { skipped: true, reason: 'no_email' };
  }

  const result = await credentialService.issueCredential({
    learnerId,
    learnerName,
    learnerEmail,
    courseId,
    courseName,
    score: score || 100, // Default to 100% if no assessment
    completedAt
  });

  return result;
}

/**
 * Send analytics data asynchronously
 */
async function sendAnalyticsJob(data) {
  const { courseId, learnerId, completedAt } = data;

  try {
    // Import analytics service if it exists
    try {
      const analyticsService = await import('./analytics.service.js').catch(() => null);
      
      if (analyticsService && analyticsService.prepareLearningAnalyticsPayload) {
        // Prepare and send analytics payload
        const payload = analyticsService.prepareLearningAnalyticsPayload({
          courseId,
          learnerId,
          completedAt,
          eventType: 'course_completed'
        });

        // TODO: Send to Learning Analytics service
        // await analyticsService.sendToLearningAnalytics(payload);
      }
    } catch (error) {
      console.warn('[CourseCompletion] Analytics service not available:', error.message);
    }

    console.log(`[CourseCompletion] Analytics prepared for course ${courseId}`);
    return { success: true };
  } catch (error) {
    console.error('[CourseCompletion] Error sending analytics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send HR report asynchronously
 */
async function sendHRReportJob(data) {
  const { courseId, learnerId, completedAt } = data;

  try {
    // Import analytics service if it exists
    try {
      const analyticsService = await import('./analytics.service.js').catch(() => null);
      
      if (analyticsService && analyticsService.prepareHRReportPayload) {
        // Prepare HR report payload
        const payload = analyticsService.prepareHRReportPayload({
          courseId,
          learnerId,
          completedAt
        });

        // TODO: Send to HR service
        // await analyticsService.sendToHR(payload);
      }
    } catch (error) {
      console.warn('[CourseCompletion] Analytics service not available:', error.message);
    }

    console.log(`[CourseCompletion] HR report prepared for course ${courseId}`);
    return { success: true };
  } catch (error) {
    console.error('[CourseCompletion] Error sending HR report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger course completion tasks
 * @param {Object} params - Completion parameters
 * @param {string} params.courseId - Course ID
 * @param {string} params.courseName - Course name
 * @param {string} params.learnerId - Learner ID
 * @param {Date} params.completedAt - Completion date
 */
export const triggerCourseCompletion = async ({ courseId, courseName, learnerId, completedAt }) => {
  try {
    console.log(`[CourseCompletion] Triggering completion tasks for learner ${learnerId} in course ${courseId}`);

    // Get learner info
    const learnerInfo = await getLearnerInfo(learnerId, courseId);
    if (!learnerInfo) {
      console.warn(`[CourseCompletion] Could not find learner info for ${learnerId}`);
      return;
    }

    // Get assessment score
    const score = await getAssessmentScore(learnerId, courseId);

    // Queue credential issuance (high priority)
    if (process.env.ENABLE_CREDENTIALS !== 'false') {
      await addHighPriorityJob(issueCredentialJob, {
        courseId,
        courseName,
        learnerId,
        learnerName: learnerInfo.learnerName,
        learnerEmail: learnerInfo.learnerEmail,
        score,
        completedAt
      });
    }

    // Queue analytics distribution (normal priority)
    await addJob(sendAnalyticsJob, {
      courseId,
      learnerId,
      completedAt
    });

    // Queue HR report (normal priority)
    await addJob(sendHRReportJob, {
      courseId,
      learnerId,
      completedAt
    });

    console.log(`[CourseCompletion] All completion tasks queued for course ${courseId}`);
  } catch (error) {
    console.error('[CourseCompletion] Error triggering completion tasks:', error);
    // Don't throw - completion tasks shouldn't block progress update
  }
};

export default {
  triggerCourseCompletion
};

