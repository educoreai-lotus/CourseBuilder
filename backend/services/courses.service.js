import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Browse courses with filters
 */
export const browseCourses = async ({ search, category, level, sort, page, limit }) => {
  try {
    let query = `
      SELECT 
        c.course_id as id,
        c.course_name as title,
        c.course_description as description,
        c.level,
        COALESCE(c.average_rating, 0) as rating,
        c.metadata->'tags' as tags,
        c.duration,
        c.metadata->'thumbnail_url' as thumbnail_url,
        c.created_at
      FROM courses c
      WHERE c.visibility = 'public' AND c.status = 'live'
    `;
    const params = [];

    // Apply filters
    if (search) {
      query += ` AND (c.course_name ILIKE $${params.length + 1} OR c.course_description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (level) {
      query += ` AND c.level = $${params.length + 1}`;
      params.push(level);
    }

    if (category) {
      query += ` AND c.metadata->'category' = $${params.length + 1}`;
      params.push(`"${category}"`);
    }

    // Sorting
    const sortMap = {
      newest: 'c.created_at DESC',
      rating: 'c.average_rating DESC',
      popular: 'c.total_enrollments DESC'
    };
    query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM courses
      WHERE visibility = 'public' AND status = 'live'
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (course_name ILIKE $${countParams.length + 1} OR course_description ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }
    if (level) {
      countQuery += ` AND level = $${countParams.length + 1}`;
      countParams.push(level);
    }
    if (category) {
      countQuery += ` AND metadata->'category' = $${countParams.length + 1}`;
      countParams.push(`"${category}"`);
    }

    const [courses, totalResult] = await Promise.all([
      db.any(query, params),
      db.one(countQuery, countParams)
    ]);

    return {
      page: parseInt(page, 10),
      total: parseInt(totalResult.total, 10),
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        level: course.level,
        rating: parseFloat(course.rating) || 0,
        tags: course.tags || [],
        duration: course.duration,
        thumbnail_url: course.thumbnail_url,
        created_at: course.created_at.toISOString()
      }))
    };
  } catch (error) {
    console.error('Error browsing courses:', error);
    throw error;
  }
};

/**
 * Get course details with full structure
 */
export const getCourseDetails = async (courseId) => {
  try {
    // Get course
    const course = await db.oneOrNone(
      `SELECT 
        course_id as id,
        course_name as title,
        course_description as description,
        level,
        COALESCE(average_rating, 0) as rating,
        metadata->'skills' as skills,
        (SELECT version_no FROM versions WHERE course_id = $1 ORDER BY created_at DESC LIMIT 1) as version
      FROM courses
      WHERE course_id = $1 AND (visibility = 'public' OR visibility = 'scheduled')`,
      [courseId]
    );

    if (!course) {
      return null;
    }

    // Get modules with lessons
    const modules = await db.any(
      `SELECT 
        m.module_id as id,
        m.name as title,
        m.order,
        json_agg(
          json_build_object(
            'id', l.lesson_id,
            'title', l.lesson_name,
            'order', l.order,
            'content_ref', l.content_data->>'content_ref'
          ) ORDER BY l.order
        ) as lessons
      FROM modules m
      LEFT JOIN lessons l ON l.module_id = m.module_id
      WHERE m.course_id = $1
      GROUP BY m.module_id, m.name, m.order
      ORDER BY m.order`,
      [courseId]
    );

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      modules: modules.map(m => ({
        id: m.id,
        title: m.title,
        order: m.order,
        lessons: m.lessons.filter(l => l.id !== null) // Remove null lessons
      })),
      skills: course.skills || [],
      rating: parseFloat(course.rating) || 0,
      version: course.version?.toString() || '1'
    };
  } catch (error) {
    console.error('Error getting course details:', error);
    throw error;
  }
};

/**
 * Register a learner for a course
 */
export const registerLearner = async (courseId, { learner_id, company_id }) => {
  try {
    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id FROM courses WHERE course_id = $1 AND status = $2',
      [courseId, 'live']
    );

    if (!course) {
      const error = new Error('Course not found or not available');
      error.status = 404;
      throw error;
    }

    // Check if already registered
    const existing = await db.oneOrNone(
      'SELECT registration_id FROM registrations WHERE course_id = $1 AND learner_id = $2',
      [courseId, learner_id]
    );

    if (existing) {
      const error = new Error('Learner is already registered for this course');
      error.code = '23505';
      throw error;
    }

    // Create registration
    const registrationId = uuidv4();
    await db.none(
      `INSERT INTO registrations (registration_id, course_id, learner_id, learner_name, learner_company, progress, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [registrationId, courseId, learner_id, 'Learner', company_id || null, 0, 'in_progress']
    );

    // Update course enrollment count
    await db.none(
      'UPDATE courses SET total_enrollments = total_enrollments + 1, active_enrollments = active_enrollments + 1 WHERE course_id = $1',
      [courseId]
    );

    return {
      status: 'registered',
      course_id: courseId,
      learner_id: learner_id,
      registered_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error registering learner:', error);
    throw error;
  }
};

/**
 * Get all courses (CRUD: Read all)
 * Alias for browseCourses with default filters
 */
export const getAllCourses = async (filters = {}) => {
  return browseCourses({
    search: filters.search,
    category: filters.category,
    level: filters.level,
    sort: filters.sort || 'newest',
    page: filters.page || 1,
    limit: filters.limit || 10
  });
};

/**
 * Get course by ID (CRUD: Read one)
 * Alias for getCourseDetails
 */
export const getCourseById = async (courseId) => {
  return getCourseDetails(courseId);
};

/**
 * Create course (CRUD: Create)
 */
export const createCourse = async (courseData) => {
  try {
    const courseId = uuidv4();
    const {
      course_name,
      course_description,
      level,
      trainer_id,
      trainer_name,
      skills = [],
      metadata = {}
    } = courseData;

    await db.none(
      `INSERT INTO courses (
        course_id, course_name, course_description, level, 
        trainer_id, trainer_name, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        courseId,
        course_name,
        course_description,
        level,
        trainer_id,
        trainer_name,
        JSON.stringify({ ...metadata, skills })
      ]
    );

    // Create initial version
    await db.none(
      `INSERT INTO versions (course_id, version_no, status, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [courseId, 1, 'draft']
    );

    return {
      course_id: courseId,
      status: 'draft',
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

/**
 * Update course (CRUD: Update)
 */
export const updateCourse = async (courseId, updates) => {
  try {
    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.course_name) {
      updateFields.push(`course_name = $${paramIndex++}`);
      values.push(updates.course_name);
    }
    if (updates.course_description) {
      updateFields.push(`course_description = $${paramIndex++}`);
      values.push(updates.course_description);
    }
    if (updates.level) {
      updateFields.push(`level = $${paramIndex++}`);
      values.push(updates.level);
    }
    if (updates.skills || updates.metadata) {
      const currentMetadata = await db.one(
        'SELECT metadata FROM courses WHERE course_id = $1',
        [courseId]
      );
      const updatedMetadata = {
        ...currentMetadata.metadata,
        ...updates.metadata,
        ...(updates.skills && { skills: updates.skills })
      };
      updateFields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updatedMetadata));
    }

    if (updateFields.length === 0) {
      return { course_id: courseId, status: 'unchanged' };
    }

    // Add updated_at trigger
    updateFields.push(`updated_at = NOW()`);
    values.push(courseId);

    await db.none(
      `UPDATE courses SET ${updateFields.join(', ')} WHERE course_id = $${paramIndex}`,
      values
    );

    // Get latest version and create new version if needed
    const latestVersion = await db.oneOrNone(
      'SELECT version_no FROM versions WHERE course_id = $1 ORDER BY created_at DESC LIMIT 1',
      [courseId]
    );

    const newVersionNo = latestVersion ? latestVersion.version_no + 1 : 1;
    await db.none(
      `INSERT INTO versions (course_id, version_no, status, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [courseId, newVersionNo, 'draft']
    );

    return {
      course_id: courseId,
      status: 'updated',
      version_no: newVersionNo,
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const coursesService = {
  browseCourses,
  getAllCourses,
  getCourseDetails,
  getCourseById,
  createCourse,
  updateCourse,
  registerLearner
};

