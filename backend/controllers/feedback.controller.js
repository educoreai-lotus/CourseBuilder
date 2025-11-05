import { feedbackService } from '../services/feedback.service.js';

/**
 * Submit feedback for a course
 * POST /api/v1/courses/:id/feedback
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { learner_id, rating, tags, comment } = req.body;

    // Validation
    if (!learner_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'learner_id is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'rating must be between 1 and 5'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await feedbackService.submitFeedback(courseId, {
      learner_id,
      rating: parseFloat(rating),
      tags: tags || [],
      comment: comment || ''
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation (duplicate feedback)
      return res.status(409).json({
        error: 'Conflict',
        message: 'Feedback already submitted for this course'
      });
    }
    next(error);
  }
};

/**
 * Get aggregated feedback for a course
 * GET /api/v1/feedback/:courseId
 */
export const getAggregatedFeedback = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await feedbackService.getAggregatedFeedback(courseId);

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found or no feedback available'
      });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const feedbackController = {
  submitFeedback,
  getAggregatedFeedback
};


