import express from 'express';
import { feedbackController } from '../controllers/feedback.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';
import { feedbackLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * POST /api/v1/courses/:id/feedback
 * Submit feedback for a course
 */
router.post('/courses/:id/feedback', feedbackLimiter, authorizeRoles('learner'), feedbackController.submitFeedback);

/**
 * GET /api/v1/courses/:id/feedback/self
 * Retrieve the authenticated learner's feedback for a course
 */
router.get('/courses/:id/feedback/self', authorizeRoles('learner'), feedbackController.getLearnerFeedback);

/**
 * PUT /api/v1/courses/:id/feedback
 * Update existing feedback for a course
 */
router.put('/courses/:id/feedback', authorizeRoles('learner'), feedbackController.updateFeedback);

/**
 * DELETE /api/v1/courses/:id/feedback
 * Remove learner feedback for a course
 */
router.delete('/courses/:id/feedback', authorizeRoles('learner'), feedbackController.deleteFeedback);

/**
 * GET /api/v1/feedback/:courseId
 * Get aggregated feedback for a course
 */
router.get('/feedback/:courseId', authorizeRoles('learner', 'trainer', 'admin'), feedbackController.getAggregatedFeedback);

export default router;


