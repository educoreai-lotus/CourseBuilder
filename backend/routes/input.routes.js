import { Router } from 'express';
import { acceptCourseInput } from '../controllers/input.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/v1/courses/input
 * Accept course input from Content Studio (trainer-driven)
 */
router.post('/courses/input', authorizeRoles('trainer', 'service'), acceptCourseInput);

/**
 * POST /api/v1/ai/trigger-personalized-course
 * Learner AI trigger for personalized course generation
 */
router.post('/ai/trigger-personalized-course', authorizeRoles('service'), acceptCourseInput);

export default router;


