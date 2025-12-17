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
 * @deprecated LEGACY_FLOW
 * POST /api/v1/directory/trigger-learning-path
 * 
 * ⚠️ Directory trigger for personalized course generation - CURRENTLY INACTIVE
 * 
 * PREVIOUS FLOW (DISABLED):
 * Directory → Course Builder → Learner AI → Content Studio → Course Builder
 * 
 * CURRENT ACTIVE FLOW:
 * Directory → Skills Engine → Learner AI → Course Builder → Content Studio → Build Course
 * 
 * Course Builder now accepts triggers ONLY from Learner AI, not from Directory.
 * This route is preserved for potential future reactivation but currently returns 410 Gone.
 */
router.post(
  '/directory/trigger-learning-path',
  authorizeRoles('service', 'admin'),
  handleDirectoryTrigger
);

export default router;


