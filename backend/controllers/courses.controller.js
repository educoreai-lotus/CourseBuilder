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

    const requesterRole =
      req.user?.role ||
      req.headers['x-user-role'] ||
      req.headers['x-role'] ||
      null;

    const result = await coursesService.browseCourses({
      search,
      category,
      level,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      role: requesterRole
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
    const { learner_id: learnerId } = req.query;
    const requesterRole =
      req.user?.role ||
      req.headers['x-user-role'] ||
      req.headers['x-role'] ||
      null;
    
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const course = await coursesService.getCourseDetails(id, {
      learnerId,
      role: requesterRole
    });

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

/**
 * Update learner progress within a course
 * PATCH /api/v1/courses/:id/progress
 */
export const updateCourseProgress = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { learner_id: learnerId, lesson_id: lessonId, completed = true } = req.body;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    if (!learnerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'learner_id is required'
      });
    }

    if (!lessonId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'lesson_id is required'
      });
    }

    const result = await coursesService.updateLessonProgress(courseId, {
      learner_id: learnerId,
      lesson_id: lessonId,
      completed: Boolean(completed)
    });

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

/**
 * Create course (Trainer/Admin)
 * POST /api/v1/courses
 */
export const createCourse = async (req, res, next) => {
  try {
    const courseData = req.body;
    
    // Basic validation
    if (!courseData.course_name || !courseData.course_description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'course_name and course_description are required'
      });
    }

    const result = await coursesService.createCourse(courseData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update course metadata (Trainer/Admin)
 * PUT /api/v1/courses/:id
 */
export const updateCourse = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const updates = req.body;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await coursesService.updateCourse(courseId, updates);
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

/**
 * Publish course immediately (Trainer/Admin)
 * POST /api/v1/courses/:id/publish
 */
export const publishCourse = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await coursesService.publishCourse(courseId);
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

/**
 * Schedule course publishing (Trainer/Admin)
 * POST /api/v1/courses/:id/schedule
 */
export const schedulePublishing = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { publish_at } = req.body;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    if (!publish_at) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'publish_at (ISO8601) is required'
      });
    }

    const result = await coursesService.schedulePublishing(courseId, publish_at);
    res.status(200).json(result);
  } catch (error) {
    if (error.status === 404 || error.status === 400) {
      return res.status(error.status).json({
        error: error.status === 404 ? 'Not Found' : 'Bad Request',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Unpublish/archive course (Admin)
 * POST /api/v1/courses/:id/unpublish
 */
export const unpublishCourse = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await coursesService.unpublishCourse(courseId);
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

/**
 * Get course version history (Trainer/Admin)
 * GET /api/v1/courses/:id/versions
 */
export const getCourseVersions = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    const result = await coursesService.getCourseVersions(courseId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get available filter values
 * GET /api/v1/courses/filters
 */
export const getCourseFilters = async (req, res, next) => {
  try {
    const result = await coursesService.getCourseFilters();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get lesson details
 * GET /api/v1/lessons/:id
 */
export const getLessonDetails = async (req, res, next) => {
  try {
    const { id: lessonId } = req.params;

    if (!lessonId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Lesson ID is required'
      });
    }

    const lesson = await coursesService.getLessonDetails(lessonId);

    if (!lesson) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Lesson not found'
      });
    }

    res.status(200).json(lesson);
  } catch (error) {
    next(error);
  }
};

/**
 * Get learner progress for enrolled courses
 * GET /api/v1/learners/:learnerId/progress
 */
export const getLearnerProgress = async (req, res, next) => {
  try {
    const { learnerId } = req.params;

    if (!learnerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Learner ID is required'
      });
    }

    const progress = await coursesService.getLearnerProgress(learnerId);
    res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
};

export const coursesController = {
  browseCourses,
  getCourseDetails,
  registerForCourse,
  updateCourseProgress,
  createCourse,
  updateCourse,
  publishCourse,
  schedulePublishing,
  unpublishCourse,
  getCourseVersions,
  getCourseFilters,
  getLessonDetails,
  getLearnerProgress
};


