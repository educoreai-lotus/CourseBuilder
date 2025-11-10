import express from 'express';
import { feedbackController } from '../controllers/feedback.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/v1/courses/:id/feedback
 * Submit feedback for a course
 */
router.post('/courses/:id/feedback', authorizeRoles('learner'), feedbackController.submitFeedback);

/**
 * GET /api/v1/feedback/:courseId
 * Get aggregated feedback for a course
 */
router.get('/feedback/:courseId', authorizeRoles('trainer', 'admin'), feedbackController.getAggregatedFeedback);

export default router;


