import express from 'express';
import { feedbackController } from '../controllers/feedback.controller.js';

const router = express.Router();

/**
 * POST /api/v1/courses/:id/feedback
 * Submit feedback for a course
 */
router.post('/courses/:id/feedback', feedbackController.submitFeedback);

/**
 * GET /api/v1/feedback/:courseId
 * Get aggregated feedback for a course
 */
router.get('/feedback/:courseId', feedbackController.getAggregatedFeedback);

export default router;


