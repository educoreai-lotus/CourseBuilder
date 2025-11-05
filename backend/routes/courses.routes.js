import express from 'express';
import { coursesController } from '../controllers/courses.controller.js';

const router = express.Router();

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
 * POST /api/v1/courses/:id/register
 * Register a learner for a course
 */
router.post('/:id/register', coursesController.registerForCourse);

export default router;


