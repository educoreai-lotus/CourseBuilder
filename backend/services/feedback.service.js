import db from '../config/database.js';
import feedbackRepository from '../repositories/FeedbackRepository.js';
import courseRepository from '../repositories/CourseRepository.js';
import { sendToDirectory } from './gateways/directoryGateway.js';
import { sendCourseAnalytics } from '../integration/clients/learningAnalyticsClient.js';
import { v4 as uuidv4 } from 'uuid';

const validateRating = (rating) => {
  const ratingNum = parseFloat(rating);

  if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    const error = new Error('Rating must be between 1 and 5');
    error.status = 400;
    throw error;
  }

  return Math.round(ratingNum * 10) / 10;
};

/**
 * Update feedbackDictionary in course
 */
const updateCourseFeedbackDictionary = async (courseId, learnerId, feedbackData) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const feedbackDict = course.feedbackDictionary || {};
  feedbackDict[learnerId] = {
    rating: feedbackData.rating,
    comment: feedbackData.comment || null,
    submitted_at: new Date().toISOString()
  };

  await courseRepository.update(courseId, { feedbackDictionary: feedbackDict });
};

/**
 * Submit feedback for a course
 * Enforces 1-5 rating validation and duplicate learner check
 */
export const submitFeedback = async (courseId, { learner_id, rating, comment }) => {
  try {
    // Validate rating (1-5)
    const normalizedRating = validateRating(rating);

    // Check if course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Check if feedback already submitted (one feedback per learner per course)
    const existing = await feedbackRepository.findByLearnerAndCourse(learner_id, courseId);
    if (existing) {
      const error = new Error('Feedback already submitted for this course');
      error.code = '23505';
      error.status = 409;
      throw error;
    }

    // Create feedback record
    const feedback = await feedbackRepository.create({
      learner_id,
      course_id: courseId,
      rating: normalizedRating,
      comment: comment || null
    });

    // Update course feedbackDictionary
    await updateCourseFeedbackDictionary(courseId, learner_id, {
      rating: normalizedRating,
      comment: comment || null
    });

    // Share feedback with Directory and Learning Analytics (async, don't block response)
    // Fire and forget - don't await to prevent blocking the response
    (async () => {
      try {
        // Get course for sharing
        const courseForSharing = await courseRepository.findById(courseId);
        
        // Share with Directory (fire and forget)
        sendToDirectory(feedback, courseForSharing)
          .then(() => {
            console.log('[Feedback Service] Feedback shared with Directory successfully');
          })
          .catch((dirError) => {
            console.error('[Feedback Service] Failed to share feedback with Directory:', dirError.message);
            // Don't throw - feedback is saved, sharing is best-effort
          });

        // Share with Learning Analytics (fire and forget)
        const feedbackArray = [feedback];
        sendCourseAnalytics(courseForSharing, [], [], [], feedbackArray, [])
          .then(() => {
            console.log('[Feedback Service] Feedback shared with Learning Analytics successfully');
          })
          .catch((analyticsError) => {
            console.error('[Feedback Service] Failed to share feedback with Learning Analytics:', analyticsError.message);
            // Don't throw - feedback is saved, sharing is best-effort
          });
      } catch (shareError) {
        console.error('[Feedback Service] Error during feedback sharing:', shareError.message);
        // Don't throw - feedback is saved, sharing is best-effort
      }
    })();

    return {
      message: 'Feedback submitted successfully',
      feedback_id: feedback.id,
      id: feedback.id,
      timestamp: feedback.submitted_at?.toISOString() || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

/**
 * Get aggregated feedback for a course
 */
export const getAggregatedFeedback = async (courseId) => {
  try {
    // Check if course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      return null;
    }

    // Get aggregated stats from feedback table
    const stats = await db.oneOrNone(
      `SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings
      FROM feedback
      WHERE course_id = $1`,
      [courseId]
    );

    if (!stats || stats.total_ratings === '0') {
      return {
        course_id: courseId,
        id: courseId,
        average_rating: 0,
        total_ratings: 0,
        recent_comments: []
      };
    }

    // Get recent comments (limit 10, anonymized)
    const recentComments = await db.any(
      `SELECT 
        rating,
        comment,
        submitted_at as timestamp
      FROM feedback
      WHERE course_id = $1 AND comment IS NOT NULL AND comment != ''
      ORDER BY submitted_at DESC
      LIMIT 10`,
      [courseId]
    );

    return {
      course_id: courseId,
      id: courseId,
      average_rating: parseFloat(stats.average_rating) || 0,
      total_ratings: parseInt(stats.total_ratings, 10),
      recent_comments: recentComments.map(c => ({
        learner_name: 'Anonymous', // Anonymized as per GDPR
        rating: parseFloat(c.rating),
        comment: c.comment,
        timestamp: c.timestamp.toISOString()
      }))
    };
  } catch (error) {
    console.error('Error getting aggregated feedback:', error);
    throw error;
  }
};

/**
 * Get feedback summary (alias for getAggregatedFeedback)
 */
export const getFeedbackSummary = async (courseId) => {
  return getAggregatedFeedback(courseId);
};

export const getLearnerFeedback = async (courseId, learnerId) => {
  const feedback = await feedbackRepository.findByLearnerAndCourse(learnerId, courseId);
  if (!feedback) {
    return null;
  }

  return {
    feedback_id: feedback.id,
    id: feedback.id,
    course_id: feedback.course_id,
    learner_id: feedback.learner_id,
    rating: feedback.rating,
    comment: feedback.comment,
    submitted_at: feedback.submitted_at?.toISOString() || null
  };
};

export const updateFeedback = async (courseId, learnerId, { rating, comment }) => {
  const normalizedRating = validateRating(rating);

  const existing = await feedbackRepository.findByLearnerAndCourse(learnerId, courseId);
  if (!existing) {
    const error = new Error('Feedback not found for this course');
    error.status = 404;
    throw error;
  }

  const updated = await feedbackRepository.update(existing.id, {
    rating: normalizedRating,
    comment: comment || null
  });

  // Update course feedbackDictionary
  await updateCourseFeedbackDictionary(courseId, learnerId, {
    rating: normalizedRating,
    comment: comment || null
  });

  // Share updated feedback with Directory and Learning Analytics (async, don't block response)
  try {
    const courseForSharing = await courseRepository.findById(courseId);
    
    // Share with Directory
    try {
      await sendToDirectory(updated, courseForSharing);
      console.log('[Feedback Service] Updated feedback shared with Directory successfully');
    } catch (dirError) {
      console.error('[Feedback Service] Failed to share updated feedback with Directory:', dirError.message);
    }

    // Share with Learning Analytics
    try {
      const feedbackArray = [updated];
      await sendCourseAnalytics(courseForSharing, [], [], [], feedbackArray, []);
      console.log('[Feedback Service] Updated feedback shared with Learning Analytics successfully');
    } catch (analyticsError) {
      console.error('[Feedback Service] Failed to share updated feedback with Learning Analytics:', analyticsError.message);
    }
  } catch (shareError) {
    console.error('[Feedback Service] Error during updated feedback sharing:', shareError.message);
  }

  return {
    message: 'Feedback updated successfully',
    feedback_id: updated.id,
    id: updated.id,
    timestamp: updated.submitted_at?.toISOString() || new Date().toISOString()
  };
};

export const deleteFeedback = async (courseId, learnerId) => {
  const existing = await feedbackRepository.findByLearnerAndCourse(learnerId, courseId);
  if (!existing) {
    const error = new Error('Feedback not found for this course');
    error.status = 404;
    throw error;
  }

  await feedbackRepository.delete(existing.id);

  // Update course feedbackDictionary
  const course = await courseRepository.findById(courseId);
  if (course) {
    const feedbackDict = course.feedbackDictionary || {};
    delete feedbackDict[learnerId];
    await courseRepository.update(courseId, { feedbackDictionary: feedbackDict });
  }

  return {
    message: 'Feedback removed successfully',
    timestamp: new Date().toISOString()
  };
};

/**
 * Get feedback analytics for trainers
 * Returns detailed analytics with rating trends and date filtering
 */
export const getFeedbackAnalytics = async (courseId, { from, to } = {}) => {
  try {
    // Check if course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Build date filter
    let dateFilter = '';
    const params = [courseId];
    if (from) {
      dateFilter += ` AND f.submitted_at >= $${params.length + 1}`;
      params.push(new Date(from));
    }
    if (to) {
      dateFilter += ` AND f.submitted_at <= $${params.length + 1}`;
      params.push(new Date(to));
    }

    // Get overall stats
    const stats = await db.oneOrNone(
      `SELECT 
        AVG(f.rating) as average_rating,
        COUNT(*) as total_feedback
      FROM feedback f
      WHERE f.course_id = $1 ${dateFilter}`,
      params
    );

    // Get rating trend (daily averages)
    const ratingTrend = await db.any(
      `SELECT 
        DATE(f.submitted_at) as date,
        AVG(f.rating) as avg_rating
      FROM feedback f
      WHERE f.course_id = $1 ${dateFilter}
      GROUP BY DATE(f.submitted_at)
      ORDER BY date ASC`,
      params
    );

    // Get version breakdown from versions table
    const versionStats = await db.any(
      `SELECT 
        v.version_number as version_no,
        COUNT(f.id) as feedback_count,
        AVG(f.rating) as avg_rating
      FROM versions v
      LEFT JOIN feedback f ON f.course_id = v.entity_id 
        AND f.submitted_at >= v.created_at
      WHERE v.entity_type = 'course' AND v.entity_id = $1
      GROUP BY v.version_number
      ORDER BY v.version_number DESC`,
      [courseId]
    );

    const versions = versionStats.map(v => ({
      version_no: v.version_no,
      version_number: v.version_no,
      avg_rating: parseFloat(v.avg_rating) || 0,
      feedback_count: parseInt(v.feedback_count, 10)
    }));

    return {
      course_id: courseId,
      id: courseId,
      average_rating: parseFloat(stats?.average_rating) || 0,
      total_feedback: parseInt(stats?.total_feedback || 0, 10),
      rating_trend: ratingTrend.map(t => ({
        date: t.date.toISOString().split('T')[0],
        avg_rating: parseFloat(t.avg_rating)
      })),
      versions: versions
    };
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    throw error;
  }
};

export const feedbackService = {
  submitFeedback,
  addFeedback: submitFeedback, // Alias
  getAggregatedFeedback,
  getFeedbackSummary,
  getLearnerFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackAnalytics
};
