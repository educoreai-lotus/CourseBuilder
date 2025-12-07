import { Router } from 'express';
import { acceptCourseInput } from '../controllers/input.controller.js';
import { handleDirectoryTrigger } from '../controllers/directory.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/v1/courses/input
 * Accept course input from Content Studio (trainer-driven marketplace courses)
 */
router.post('/courses/input', authorizeRoles('trainer', 'service'), acceptCourseInput);

/**
 * POST /api/v1/directory/trigger-learning-path
 * Directory trigger for personalized course generation
 * Flow: Directory → Course Builder → Learner AI → Content Studio → Course Builder
 */
router.post(
  '/directory/trigger-learning-path',
  authorizeRoles('service', 'admin'),
  handleDirectoryTrigger
);

export default router;


