import { feedbackService } from '../services/feedback.service.js';

const resolveLearnerId = (req) =>
  req.body?.learner_id ||
  req.user?.id ||
  req.headers['x-user-id'] ||
  req.query?.learner_id ||
  null;

const sendKnownError = (res, error) => {
  if (!error?.status) {
    return null;
  }

  const status = error.status;
  const payload = {
    error: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Bad Request',
    message: error.message
  };

  res.status(status).json(payload);
  return true;
};

/**
 * Submit feedback for a course
 * POST /api/v1/courses/:id/feedback
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { rating, tags, comment } = req.body;
    const learnerId = resolveLearnerId(req);

    // Validation
    if (!learnerId) {
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
      learner_id: learnerId,
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

    if (sendKnownError(res, error)) {
      return;
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

/**
 * Get feedback analytics for trainers
 * GET /api/v1/courses/:id/feedback/analytics
 */
export const getFeedbackAnalytics = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { from, to, version } = req.query;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await feedbackService.getFeedbackAnalytics(courseId, { from, to, version });
    res.status(200).json(result);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    next(error);
  }
};

export const feedbackController = {
  submitFeedback,
  getLearnerFeedback: async (req, res, next) => {
    try {
      const { id: courseId } = req.params;
      const learnerId = resolveLearnerId(req);

      if (!courseId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Course ID is required'
        });
      }

      if (!learnerId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Learner ID is required'
        });
      }

      const feedback = await feedbackService.getLearnerFeedback(courseId, learnerId);

      if (!feedback) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'No feedback found for this learner on the course'
        });
      }

      return res.status(200).json(feedback);
    } catch (error) {
      if (sendKnownError(res, error)) {
        return;
      }
      next(error);
    }
  },
  updateFeedback: async (req, res, next) => {
    try {
      const { id: courseId } = req.params;
      const learnerId = resolveLearnerId(req);
      const { rating, tags, comment } = req.body;

      if (!courseId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Course ID is required'
        });
      }

      if (!learnerId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Learner ID is required'
        });
      }

      const result = await feedbackService.updateFeedback(courseId, learnerId, {
        rating,
        tags,
        comment
      });

      return res.status(200).json(result);
    } catch (error) {
      if (sendKnownError(res, error)) {
        return;
      }
      next(error);
    }
  },
  deleteFeedback: async (req, res, next) => {
    try {
      const { id: courseId } = req.params;
      const learnerId = resolveLearnerId(req);

      if (!courseId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Course ID is required'
        });
      }

      if (!learnerId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Learner ID is required'
        });
      }

      await feedbackService.deleteFeedback(courseId, learnerId);

      return res.status(204).send();
    } catch (error) {
      if (sendKnownError(res, error)) {
        return;
      }
      next(error);
    }
  },
  getAggregatedFeedback,
  getFeedbackAnalytics
};


