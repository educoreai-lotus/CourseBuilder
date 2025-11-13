import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Browse courses with filters
 */
export const browseCourses = async ({ search, category, level, sort, page, limit, role }) => {
  try {
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : null;
    const isPrivilegedViewer = normalizedRole === 'trainer' || normalizedRole === 'admin';

    const filters = [];
    const params = [];

    if (!isPrivilegedViewer) {
      filters.push(`(c.visibility = 'public' OR c.visibility = 'scheduled')`);
      filters.push(`c.status = 'live'`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      filters.push(`(c.course_name ILIKE $${idx} OR c.course_description ILIKE $${idx})`);
    }

    if (level) {
      params.push(level);
      const idx = params.length;
      filters.push(`c.level = $${idx}`);
    }

    if (category) {
      params.push(category);
      const idx = params.length;
      filters.push(`c.metadata->>'category' = $${idx}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sortMap = {
      newest: 'c.created_at DESC',
      rating: 'c.average_rating DESC',
      popular: 'c.total_enrollments DESC'
    };
    const sortOrder = sortMap[sort] || sortMap.newest;

    const paginationLimit = parseInt(limit, 10);
    const paginationOffset = (parseInt(page, 10) - 1) * paginationLimit;

    const selectParams = [...params, paginationLimit, paginationOffset];

    const query = `
      SELECT 
        c.course_id as id,
        c.course_name as title,
        c.course_description as description,
        c.level,
        COALESCE(c.average_rating, 0) as rating,
        c.metadata->'tags' as tags,
        c.metadata->>'category' as category,
        c.duration,
        c.metadata->>'thumbnail_url' as thumbnail_url,
        c.created_at,
        c.updated_at,
        c.status,
        c.visibility,
        c.total_enrollments,
        c.active_enrollments,
        c.trainer_id,
        c.trainer_name
      FROM courses c
      ${whereClause}
      ORDER BY ${sortOrder}
      LIMIT $${selectParams.length - 1} OFFSET $${selectParams.length}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      ${whereClause}
    `;

    const [courses, totalResult] = await Promise.all([
      db.any(query, selectParams),
      db.one(countQuery, params)
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
        category: course.category || null,
        duration: course.duration,
        thumbnail_url: course.thumbnail_url,
        created_at: course.created_at?.toISOString?.() || null,
        updated_at: course.updated_at?.toISOString?.() || null,
        status: course.status,
        visibility: course.visibility,
        total_enrollments: course.total_enrollments,
        active_enrollments: course.active_enrollments,
        trainer_id: course.trainer_id,
        trainer_name: course.trainer_name
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
export const getCourseDetails = async (courseId, options = {}) => {
  try {
    const { learnerId, role } = options;
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : null;
    const isPrivilegedViewer = normalizedRole === 'trainer' || normalizedRole === 'admin';

    const visibilityFilters = [];

    if (!isPrivilegedViewer) {
      visibilityFilters.push(`(c.visibility = 'public' OR c.visibility = 'scheduled')`);
      visibilityFilters.push(`c.status = 'live'`);
    }

    const visibilityClause = visibilityFilters.length ? `AND ${visibilityFilters.join(' AND ')}` : '';

    const course = await db.oneOrNone(
      `SELECT 
        c.course_id as id,
        c.course_name as title,
        c.course_description as description,
        c.level,
        COALESCE(c.average_rating, 0) as rating,
        c.metadata->'skills' as skills,
        c.metadata->>'category' as category,
        c.metadata,
        c.duration,
        c.status,
        c.visibility,
        c.total_enrollments,
        c.active_enrollments,
        c.completion_rate,
        c.trainer_id,
        c.trainer_name,
        c.created_at,
        c.updated_at,
        (SELECT version_no FROM versions WHERE course_id = $1 ORDER BY created_at DESC LIMIT 1) as version
      FROM courses c
      WHERE c.course_id = $1
      ${visibilityClause}`,
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

    let learnerProgress = null;

    if (learnerId) {
      const registration = await db.oneOrNone(
        `SELECT registration_id, progress, status
         FROM registrations
         WHERE course_id = $1 AND learner_id = $2`,
        [courseId, learnerId]
      );

      if (registration) {
        const completedLessons = await db.any(
          `SELECT lesson_id
           FROM lesson_progress
           WHERE registration_id = $1 AND completed = TRUE`,
          [registration.registration_id]
        );

        learnerProgress = {
          is_enrolled: true,
          registration_id: registration.registration_id,
          progress: parseFloat(registration.progress) || 0,
          status: registration.status,
          completed_lessons: completedLessons.map((row) => row.lesson_id)
        };
      } else {
        learnerProgress = {
          is_enrolled: false,
          completed_lessons: []
        };
      }
    }

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      status: course.status,
      visibility: course.visibility,
      category: course.category || null,
      duration: course.duration,
      total_enrollments: course.total_enrollments,
      active_enrollments: course.active_enrollments,
      completion_rate: course.completion_rate ? parseFloat(course.completion_rate) : 0,
      trainer: course.trainer_id ? {
        id: course.trainer_id,
        name: course.trainer_name
      } : null,
      created_at: course.created_at?.toISOString?.() || null,
      updated_at: course.updated_at?.toISOString?.() || null,
      modules: modules.map(m => ({
        id: m.id,
        title: m.title,
        order: m.order,
        lessons: m.lessons.filter(l => l.id !== null) // Remove null lessons
      })),
      skills: Array.isArray(course.skills) ? course.skills : (course.skills ? [course.skills] : []),
      rating: parseFloat(course.rating) || 0,
      version: course.version?.toString() || '1',
      ...(learnerProgress && { learner_progress: learnerProgress })
    };
  } catch (error) {
    console.error('Error getting course details:', error);
    throw error;
  }
};

/**
 * Register a learner for a course
 */
export const registerLearner = async (courseId, { learner_id, learner_name, learner_company, company_id }) => {
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
    const finalLearnerName = learner_name || 'Learner';
    const finalCompany = learner_company || company_id || null;
    await db.none(
      `INSERT INTO registrations (registration_id, course_id, learner_id, learner_name, learner_company, progress, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [registrationId, courseId, learner_id, finalLearnerName, finalCompany, 0, 'in_progress']
    );

    // Update course enrollment count
    await db.none(
      'UPDATE courses SET total_enrollments = total_enrollments + 1, active_enrollments = active_enrollments + 1 WHERE course_id = $1',
      [courseId]
    );

    return {
      status: 'registered',
      registration_id: registrationId,
      course_id: courseId,
      learner_id: learner_id,
      registered_at: new Date().toISOString(),
      progress: 0
    };
  } catch (error) {
    console.error('Error registering learner:', error);
    throw error;
  }
};

/**
 * Update lesson progress for a learner
 */
export const updateLessonProgress = async (courseId, { learner_id, lesson_id, completed = true }) => {
  try {
    return await db.tx(async (t) => {
      const course = await t.oneOrNone(
        'SELECT course_id FROM courses WHERE course_id = $1',
        [courseId]
      );

      if (!course) {
        const error = new Error('Course not found');
        error.status = 404;
        throw error;
      }

      const registration = await t.oneOrNone(
        `SELECT registration_id, progress, status
         FROM registrations
         WHERE course_id = $1 AND learner_id = $2`,
        [courseId, learner_id]
      );

      if (!registration) {
        const error = new Error('Learner is not registered for this course');
        error.status = 404;
        throw error;
      }

      const lesson = await t.oneOrNone(
        `SELECT l.lesson_id
         FROM lessons l
         JOIN modules m ON m.module_id = l.module_id
         WHERE l.lesson_id = $1 AND m.course_id = $2`,
        [lesson_id, courseId]
      );

      if (!lesson) {
        const error = new Error('Lesson not found in course');
        error.status = 404;
        throw error;
      }

      await t.none(
        `INSERT INTO lesson_progress (registration_id, course_id, lesson_id, completed, completed_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
         ON CONFLICT (registration_id, lesson_id)
         DO UPDATE SET completed = EXCLUDED.completed,
                       completed_at = EXCLUDED.completed_at`,
        [registration.registration_id, courseId, lesson_id, completed]
      );

      const totalLessonsRow = await t.one(
        `SELECT COUNT(*)::int AS total
         FROM lessons l
         JOIN modules m ON m.module_id = l.module_id
         WHERE m.course_id = $1`,
        [courseId]
      );

      const completedLessonsRow = await t.one(
        `SELECT COUNT(*)::int AS completed
         FROM lesson_progress
         WHERE registration_id = $1 AND completed = TRUE`,
        [registration.registration_id]
      );

      const totalLessons = totalLessonsRow.total;
      const completedCount = completedLessonsRow.completed;
      const rawProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
      const progress = Number(rawProgress.toFixed(2));
      const status = progress >= 100 ? 'completed' : 'in_progress';

      await t.none(
        `UPDATE registrations
         SET progress = $1, status = $2, updated_at = NOW()
         WHERE registration_id = $3`,
        [progress, status, registration.registration_id]
      );

      const completedLessonIds = await t.any(
        `SELECT lesson_id
         FROM lesson_progress
         WHERE registration_id = $1 AND completed = TRUE
         ORDER BY completed_at ASC NULLS LAST`,
        [registration.registration_id]
      );

      return {
        course_id: courseId,
        learner_id,
        registration_id: registration.registration_id,
        lesson_id,
        completed,
        progress,
        status,
        total_lessons: totalLessons,
        completed_lessons: completedLessonIds.map((row) => row.lesson_id)
      };
    });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
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
export const getCourseById = async (courseId, options = {}) => {
  return getCourseDetails(courseId, options);
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

/**
 * Publish course immediately
 */
export const publishCourse = async (courseId) => {
  try {
    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id, status FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Update course status to live and visibility to public
    await db.none(
      `UPDATE courses 
       SET status = 'live', visibility = 'public', published_at = NOW(), updated_at = NOW()
       WHERE course_id = $1`,
      [courseId]
    );

    // Update latest version status to published
    await db.none(
      `UPDATE versions 
       SET status = 'published', published_at = NOW()
       WHERE course_id = $1 AND version_no = (
         SELECT MAX(version_no) FROM versions WHERE course_id = $1
       )`,
      [courseId]
    );

    return {
      course_id: courseId,
      status: 'live',
      published_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error publishing course:', error);
    throw error;
  }
};

/**
 * Schedule course publishing
 */
export const schedulePublishing = async (courseId, publishAt) => {
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

    // Validate publish_at is in the future
    const publishDate = new Date(publishAt);
    if (publishDate <= new Date()) {
      const error = new Error('Publish date must be in the future');
      error.status = 400;
      throw error;
    }

    // Update course status to scheduled
    await db.none(
      `UPDATE courses 
       SET status = 'scheduled', visibility = 'scheduled', updated_at = NOW()
       WHERE course_id = $1`,
      [courseId]
    );

    // Store scheduled publish time in metadata (or create a scheduled_publish_at column)
    await db.none(
      `UPDATE courses 
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{scheduled_publish_at}',
         to_jsonb($1::text)
       )
       WHERE course_id = $2`,
      [publishAt, courseId]
    );

    return {
      course_id: courseId,
      status: 'scheduled',
      scheduled_at: publishAt
    };
  } catch (error) {
    console.error('Error scheduling course:', error);
    throw error;
  }
};

/**
 * Validate course (set status to validated)
 */
export const validateCourse = async (courseId) => {
  try {
    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id, status FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Update course status to validated
    await db.none(
      `UPDATE courses 
       SET status = 'validated', updated_at = NOW()
       WHERE course_id = $1`,
      [courseId]
    );

    // Update latest version status to validated
    await db.none(
      `UPDATE versions 
       SET status = 'validated'
       WHERE course_id = $1 AND version_no = (
         SELECT MAX(version_no) FROM versions WHERE course_id = $1
       )`,
      [courseId]
    );

    return {
      course_id: courseId,
      status: 'validated',
      validated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error validating course:', error);
    throw error;
  }
};

/**
 * Unpublish/archive course
 */
export const unpublishCourse = async (courseId) => {
  try {
    // Check if course exists
    const course = await db.oneOrNone(
      'SELECT course_id, status FROM courses WHERE course_id = $1',
      [courseId]
    );

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    // Update course status to archived
    await db.none(
      `UPDATE courses 
       SET status = 'archived', visibility = 'private', updated_at = NOW()
       WHERE course_id = $1`,
      [courseId]
    );

    // Update latest version status to archived
    await db.none(
      `UPDATE versions 
       SET status = 'archived'
       WHERE course_id = $1 AND version_no = (
         SELECT MAX(version_no) FROM versions WHERE course_id = $1
       )`,
      [courseId]
    );

    return {
      course_id: courseId,
      status: 'archived',
      unpublished_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error unpublishing course:', error);
    throw error;
  }
};

/**
 * Get course version history
 */
export const getCourseVersions = async (courseId) => {
  try {
    const versions = await db.any(
      `SELECT 
        version_no,
        status,
        created_at,
        published_at
      FROM versions
      WHERE course_id = $1
      ORDER BY version_no DESC`,
      [courseId]
    );

    return {
      course_id: courseId,
      versions: versions.map(v => ({
        version_no: v.version_no,
        status: v.status,
        created_at: v.created_at.toISOString(),
        published_at: v.published_at ? v.published_at.toISOString() : null
      }))
    };
  } catch (error) {
    console.error('Error getting course versions:', error);
    throw error;
  }
};

/**
 * Get lesson details with full content
 */
export const getLessonDetails = async (lessonId) => {
  try {
    const lesson = await db.oneOrNone(
      `SELECT 
        l.lesson_id as id,
        l.lesson_name as title,
        l.content_type,
        l.content_data,
        l.micro_skills,
        l.nano_skills,
        l.enrichment_data,
        l.order,
        m.module_id as module_id,
        m.name as module_name,
        c.course_id as course_id,
        c.course_name as course_name
      FROM lessons l
      JOIN modules m ON m.module_id = l.module_id
      JOIN courses c ON c.course_id = m.course_id
      WHERE l.lesson_id = $1`,
      [lessonId]
    );

    if (!lesson) {
      return null;
    }

    return {
      id: lesson.id,
      title: lesson.title,
      content_type: lesson.content_type,
      content_data: lesson.content_data || {},
      micro_skills: lesson.micro_skills || [],
      nano_skills: lesson.nano_skills || [],
      enrichment_data: lesson.enrichment_data || {},
      order: lesson.order,
      module: {
        id: lesson.module_id,
        name: lesson.module_name
      },
      course: {
        id: lesson.course_id,
        name: lesson.course_name
      }
    };
  } catch (error) {
    console.error('Error getting lesson details:', error);
    throw error;
  }
};

/**
 * Get learner progress for enrolled courses
 */
export const getLearnerProgress = async (learnerId) => {
  try {
    const registrations = await db.any(
      `SELECT 
        r.course_id,
        c.course_name as title,
        r.progress,
        r.status,
        r.created_at as enrolled_at,
        c.level,
        c.average_rating as rating,
        (SELECT COUNT(*)::int 
         FROM lessons l 
         JOIN modules m ON m.module_id = l.module_id 
         WHERE m.course_id = r.course_id) as lessons_total
      FROM registrations r
      JOIN courses c ON c.course_id = r.course_id
      WHERE r.learner_id = $1
      ORDER BY r.created_at DESC`,
      [learnerId]
    );

    return registrations.map(r => ({
      course_id: r.course_id,
      title: r.title,
      progress: parseFloat(r.progress) || 0,
      status: r.status,
      enrolled_at: r.enrolled_at.toISOString(),
      level: r.level,
      rating: parseFloat(r.rating) || 0,
      lessons_total: r.lessons_total || 0
    }));
  } catch (error) {
    console.error('Error getting learner progress:', error);
    throw error;
  }
};

/**
 * Get available filter values
 */
export const getCourseFilters = async () => {
  try {
    const [levels, categories, tags] = await Promise.all([
      db.any(`SELECT DISTINCT level FROM courses WHERE visibility = 'public' AND status = 'live' ORDER BY level`),
      db.any(`SELECT DISTINCT metadata->>'category' as category FROM courses WHERE visibility = 'public' AND status = 'live' AND metadata->>'category' IS NOT NULL`),
      db.any(`SELECT DISTINCT jsonb_array_elements_text(metadata->'tags') as tag FROM courses WHERE visibility = 'public' AND status = 'live' AND metadata->'tags' IS NOT NULL`)
    ]);

    return {
      levels: levels.map(l => l.level).filter(Boolean),
      categories: categories.map(c => c.category).filter(Boolean),
      tags: tags.map(t => t.tag).filter(Boolean)
    };
  } catch (error) {
    console.error('Error getting course filters:', error);
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
  registerLearner,
  updateLessonProgress,
  publishCourse,
  schedulePublishing,
  unpublishCourse,
  validateCourse,
  getCourseVersions,
  getCourseFilters,
  getLessonDetails,
  getLearnerProgress
};

