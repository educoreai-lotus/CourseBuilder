import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Submit feedback for a course
 * Enforces 1-5 rating validation and duplicate learner check
 */
export const submitFeedback = async (courseId, { learner_id, rating, tags, comment }) => {
  try {
    // Validate rating (1-5)
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      const error = new Error('Rating must be between 1 and 5');
      error.status = 400;
      throw error;
    }

    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Check if feedback already submitted (one feedback per learner per course)
    const existing = await db.oneOrNone(
      'SELECT feedback_id FROM feedback WHERE course_id = $1 AND learner_id = $2',
      [courseId, learner_id]
    );

    if (existing) {
      const error = new Error('Feedback already submitted for this course');
      error.code = '23505';
      error.status = 409;
      throw error;
    }

    // Create feedback record
    const feedbackId = uuidv4();
    await db.none(
      `INSERT INTO feedback (feedback_id, course_id, learner_id, rating, tags, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [feedbackId, courseId, learner_id, rating, JSON.stringify(tags), comment || '']
    );

    // Update course average rating
    const avgResult = await db.one(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM feedback
       WHERE course_id = $1`,
      [courseId]
    );

    await db.none(
      'UPDATE courses SET average_rating = $1 WHERE course_id = $2',
      [parseFloat(avgResult.avg_rating) || 0, courseId]
    );

    return {
      message: 'Feedback submitted successfully',
      feedback_id: feedbackId,
      timestamp: new Date().toISOString()
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
    const course = await db.oneOrNone(
      'SELECT course_id, course_name FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      return null;
    }

    // Get aggregated stats
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
        average_rating: 0,
        total_ratings: 0,
        tags_breakdown: {},
        recent_comments: []
      };
    }

    // Get tag breakdown
    const tagBreakdown = await db.any(
      `SELECT 
        tag,
        AVG(rating) as avg_rating
      FROM feedback, jsonb_array_elements_text(tags) as tag
      WHERE course_id = $1
      GROUP BY tag`,
      [courseId]
    );

    const tagsBreakdownObj = {};
    tagBreakdown.forEach(item => {
      tagsBreakdownObj[item.tag] = parseFloat(item.avg_rating);
    });

    // Get recent comments (limit 10, anonymized)
    const recentComments = await db.any(
      `SELECT 
        rating,
        comment,
        created_at as timestamp
      FROM feedback
      WHERE course_id = $1 AND comment IS NOT NULL AND comment != ''
      ORDER BY created_at DESC
      LIMIT 10`,
      [courseId]
    );

    return {
      course_id: courseId,
      average_rating: parseFloat(stats.average_rating) || 0,
      total_ratings: parseInt(stats.total_ratings, 10),
      tags_breakdown: tagsBreakdownObj,
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

export const feedbackService = {
  submitFeedback,
  addFeedback: submitFeedback, // Alias
  getAggregatedFeedback,
  getFeedbackSummary
};

