import express from 'express';
import { coursesController } from '../controllers/courses.controller.js';
import { feedbackController } from '../controllers/feedback.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';
import { courseCreationLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * GET /api/v1/courses/filters
 * Get available filter values (levels, categories, tags)
 * Must be before /:id route
 */
router.get('/filters', coursesController.getCourseFilters);

/**
 * GET /api/v1/courses/learners/:learnerId/progress
 * Get learner progress for enrolled courses
 * Must be before /:id route
 */
router.get('/learners/:learnerId/progress', coursesController.getLearnerProgress);

/**
 * POST /api/v1/courses
 * Create a new course draft (Trainer/Admin)
 */
router.post('/', courseCreationLimiter, authorizeRoles('trainer', 'admin'), coursesController.createCourse);

/**
 * GET /api/v1/courses
 * Browse courses with optional filters
 * Query params: search, category, level, sort, page, limit
 */
router.get('/', coursesController.browseCourses);

/**
 * GET /api/v1/courses/:id
 * Get course details with full structure
 */
router.get('/:id', coursesController.getCourseDetails);

/**
 * PUT /api/v1/courses/:id
 * Update course metadata (Trainer/Admin)
 */
router.put('/:id', authorizeRoles('trainer', 'admin'), coursesController.updateCourse);

/**
 * POST /api/v1/courses/:id/register
 * Register a learner for a course
 */
router.post('/:id/register', authorizeRoles('learner'), coursesController.registerForCourse);

/**
 * DELETE /api/v1/courses/:id/enroll
 * Cancel enrollment for a learner
 */
router.delete('/:id/enroll', authorizeRoles('learner'), coursesController.cancelEnrollment);

/**
 * PATCH /api/v1/courses/:id/progress
 * Update learner lesson completion progress
 */
router.patch('/:id/progress', authorizeRoles('learner'), coursesController.updateCourseProgress);

/**
 * POST /api/v1/courses/:id/validate
 * Validate course (Trainer/Admin)
 */
router.post('/:id/validate', authorizeRoles('trainer', 'admin'), coursesController.validateCourse);

/**
 * POST /api/v1/courses/:id/publish
 * Publish course immediately (Trainer/Admin)
 */
router.post('/:id/publish', authorizeRoles('trainer', 'admin'), coursesController.publishCourse);

/**
 * POST /api/v1/courses/:id/schedule
 * Schedule course publishing (Trainer/Admin)
 */
router.post('/:id/schedule', authorizeRoles('trainer', 'admin'), coursesController.schedulePublishing);

/**
 * POST /api/v1/courses/:id/unpublish
 * Unpublish/archive course (Admin)
 */
router.post('/:id/unpublish', authorizeRoles('trainer', 'admin'), coursesController.unpublishCourse);

/**
 * GET /api/v1/courses/:id/versions
 * Get course version history (Trainer/Admin)
 */
router.get('/:id/versions', coursesController.getCourseVersions);

/**
 * GET /api/v1/courses/:id/feedback/analytics
 * Get feedback analytics for trainers
 */
router.get('/:id/feedback/analytics', feedbackController.getFeedbackAnalytics);

export default router;


