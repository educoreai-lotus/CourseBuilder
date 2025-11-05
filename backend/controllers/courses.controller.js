import { coursesService } from '../services/courses.service.js';

/**
 * Browse courses with optional filters
 * GET /api/v1/courses
 */
export const browseCourses = async (req, res, next) => {
  try {
    const {
      search,
      category,
      level,
      sort = 'newest',
      page = 1,
      limit = 10
    } = req.query;

    const result = await coursesService.browseCourses({
      search,
      category,
      level,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get course details with full structure
 * GET /api/v1/courses/:id
 */
export const getCourseDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const course = await coursesService.getCourseDetails(id);

    if (!course) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

/**
 * Register a learner for a course
 * POST /api/v1/courses/:id/register
 */
export const registerForCourse = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { learner_id, company_id } = req.body;

    if (!learner_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'learner_id is required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await coursesService.registerLearner(courseId, {
      learner_id,
      company_id
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        error: 'Conflict',
        message: 'Learner is already registered for this course'
      });
    }
    next(error);
  }
};

export const coursesController = {
  browseCourses,
  getCourseDetails,
  registerForCourse
};


