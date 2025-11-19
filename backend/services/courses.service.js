import db from '../config/database.js';
import courseRepository from '../repositories/CourseRepository.js';
import registrationRepository from '../repositories/RegistrationRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import versionRepository from '../repositories/VersionRepository.js';
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
      filters.push(`c.status = 'active'`);
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

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sortMap = {
      newest: 'c.created_at DESC',
      rating: '(SELECT AVG(rating)::numeric FROM feedback WHERE course_id = c.id) DESC NULLS LAST',
      popular: '(SELECT COUNT(*) FROM registrations WHERE course_id = c.id) DESC'
    };
    const sortOrder = sortMap[sort] || sortMap.newest;

    const paginationLimit = parseInt(limit, 10);
    const paginationOffset = (parseInt(page, 10) - 1) * paginationLimit;

    const selectParams = [...params, paginationLimit, paginationOffset];

    const query = `
      SELECT 
        c.id,
        c.course_name as title,
        c.course_description as description,
        c.level,
        c.duration_hours as duration,
        c.status,
        c.course_type,
        c.created_by_user_id,
        c.created_at,
        c.updated_at,
        (SELECT AVG(rating)::numeric FROM feedback WHERE course_id = c.id) as rating,
        (SELECT COUNT(*) FROM registrations WHERE course_id = c.id) as total_enrollments,
        (SELECT COUNT(*) FROM registrations WHERE course_id = c.id AND status = 'in_progress') as active_enrollments
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

    // Get full course data for metadata extraction
    const coursesWithMetadata = await Promise.all(
      courses.map(async (course) => {
        const courseFull = await courseRepository.findById(course.id).catch(() => null)
        const learningPathDesignation = courseFull?.learning_path_designation || {}
        
        // Check if course is personalized: primary check is course_type, fallback to learning_path_designation
        const isPersonalizedByType = course.course_type === 'learner_specific'
        const isPersonalizedByMetadata = Boolean(learningPathDesignation.personalized) || learningPathDesignation.source === 'learner_ai'
        const isPersonalizedCourse = isPersonalizedByType || isPersonalizedByMetadata
        
        // Set metadata with defaults for marketplace courses only
        const metadata = isPersonalizedCourse
          ? {
              personalized: true,
              source: learningPathDesignation.source || 'learner_ai',
              ...learningPathDesignation
            }
          : {
              personalized: false,
              source: 'marketplace',
              ...learningPathDesignation
            }

        return {
          id: course.id,
          title: course.title,
          course_name: course.title, // Keep for backward compatibility
          description: course.description,
          course_description: course.description, // Keep for backward compatibility
          level: course.level,
          rating: parseFloat(course.rating) || 0,
          duration: course.duration,
          created_at: course.created_at?.toISOString?.() || null,
          updated_at: course.updated_at?.toISOString?.() || null,
          status: course.status,
          course_type: course.course_type || 'trainer', // Include course_type
          total_enrollments: parseInt(course.total_enrollments) || 0,
          active_enrollments: parseInt(course.active_enrollments) || 0,
          created_by_user_id: course.created_by_user_id,
          metadata: metadata // Include metadata with proper defaults
        }
      })
    )

    return {
      page: parseInt(page, 10),
      total: parseInt(totalResult.total, 10),
      courses: coursesWithMetadata
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

    const course = await courseRepository.findById(courseId);
    if (!course) {
      return null;
    }

    if (!isPrivilegedViewer && course.status !== 'active') {
      return null;
    }

    // Get topics with modules and lessons
    // ⚠️ CRITICAL: Topics and Modules are structural only - Lessons contain ALL content
    const topics = await topicRepository.findByCourseId(courseId);
    const topicsData = [];
    
    for (const topic of topics) {
      const modules = await moduleRepository.findByTopicId(topic.id);
      const modulesData = [];
      
      for (const module of modules) {
        const lessons = await lessonRepository.findByModuleId(module.id);
        modulesData.push({
          id: module.id,
          module_id: module.id,
          title: module.module_name,
          module_name: module.module_name,
          description: module.module_description,
          module_description: module.module_description,
          // ⚠️ Modules are structural only - no content
          lessons: lessons.map(l => ({
            id: l.id,
            lesson_id: l.id,
            title: l.lesson_name,
            lesson_name: l.lesson_name,
            description: l.lesson_description,
            lesson_description: l.lesson_description,
            content_type: l.content_type,
            // ⚠️ Lessons contain ALL real content (from Content Studio)
            // content_data is Content Studio contents[] array (entire array as JSONB)
            content_data: Array.isArray(l.content_data) ? l.content_data : [],
            // devlab_exercises from Content Studio (array)
            devlab_exercises: Array.isArray(l.devlab_exercises) ? l.devlab_exercises : [],
            // Skills are ONLY stored at Lesson level
            skills: Array.isArray(l.skills) ? l.skills : [],
            trainer_ids: Array.isArray(l.trainer_ids) ? l.trainer_ids : []
          }))
        });
      }
      
      topicsData.push({
        id: topic.id,
        topic_id: topic.id,
        title: topic.topic_name,
        topic_name: topic.topic_name,
        summary: topic.topic_description,
        topic_description: topic.topic_description,
        // ⚠️ Topics are structural only - no content, skills computed dynamically
        modules: modulesData
      });
    }

    // Get latest version
    const latestVersion = await versionRepository.findLatestVersion('course', courseId);
    const versionNumber = latestVersion ? latestVersion.version_number : 1;

    // Calculate derived stats
    const [ratingResult, enrollmentsResult, activeEnrollmentsResult] = await Promise.all([
      db.oneOrNone('SELECT AVG(rating)::numeric as avg FROM feedback WHERE course_id = $1', [courseId]),
      db.one('SELECT COUNT(*)::int as total FROM registrations WHERE course_id = $1', [courseId]),
      db.one('SELECT COUNT(*)::int as active FROM registrations WHERE course_id = $1 AND status = $2', [courseId, 'in_progress'])
    ]);

    const completedEnrollments = await db.one('SELECT COUNT(*)::int as completed FROM registrations WHERE course_id = $1 AND status = $2', [courseId, 'completed']);
    const completionRate = enrollmentsResult.total > 0 
      ? (completedEnrollments.completed / enrollmentsResult.total) * 100 
      : 0;

    let learnerProgress = null;

    if (learnerId) {
      const registration = await registrationRepository.findByLearnerAndCourse(learnerId, courseId);

      if (registration) {
        // Get completed lessons from lesson_completion_dictionary
        const completionDict = course.lesson_completion_dictionary || {};
        const completedLessons = [];
        
        for (const [lessonId, lessonData] of Object.entries(completionDict)) {
          if (lessonData[learnerId] && lessonData[learnerId].status === 'completed') {
            completedLessons.push(lessonId);
          }
        }

        // Calculate progress
        const totalLessons = await db.one(
          `SELECT COUNT(*)::int as total
           FROM lessons l
           JOIN modules m ON m.id = l.module_id
           JOIN topics t ON t.id = m.topic_id
           WHERE t.course_id = $1`,
          [courseId]
        );

        const progress = totalLessons.total > 0 
          ? (completedLessons.length / totalLessons.total) * 100 
          : 0;

        learnerProgress = {
          is_enrolled: true,
          registration_id: registration.id,
          progress: Number(progress.toFixed(2)),
          status: registration.status,
          completed_lessons: completedLessons
        };
      } else {
        learnerProgress = {
          is_enrolled: false,
          completed_lessons: []
        };
      }
    }

    // Extract metadata from learning_path_designation
    const learningPathDesignation = course.learning_path_designation || {}
    
    // Check if course is personalized: primary check is course_type, fallback to learning_path_designation
    const isPersonalizedByType = course.course_type === 'learner_specific'
    const isPersonalizedByMetadata = Boolean(learningPathDesignation.personalized) || learningPathDesignation.source === 'learner_ai'
    const isPersonalizedCourse = isPersonalizedByType || isPersonalizedByMetadata
    
    // Set metadata with defaults for marketplace courses only
    const metadata = isPersonalizedCourse
      ? {
          personalized: true,
          source: learningPathDesignation.source || 'learner_ai',
          ...learningPathDesignation
        }
      : {
          personalized: false,
          source: 'marketplace',
          ...learningPathDesignation
        }

    return {
      id: course.id,
      title: course.course_name,
      course_name: course.course_name, // Keep for backward compatibility
      description: course.course_description,
      course_description: course.course_description, // Keep for backward compatibility
      level: course.level,
      status: course.status,
      category: null, // Not in new schema
      duration: course.duration_hours,
      duration_hours: course.duration_hours, // Keep for backward compatibility
      total_enrollments: enrollmentsResult.total || 0,
      active_enrollments: activeEnrollmentsResult.active || 0,
      completion_rate: Number(completionRate.toFixed(2)),
      rating: parseFloat(ratingResult?.avg) || 0,
      created_by_user_id: course.created_by_user_id,
      created_at: course.created_at?.toISOString?.() || null,
      updated_at: course.updated_at?.toISOString?.() || null,
      course_type: course.course_type || 'trainer', // Include course_type
      // ⚠️ Structure: Course → Topics → Modules → Lessons
      // Topics and Modules are structural only - Lessons contain ALL content
      topics: topicsData,
      modules: topicsData.flatMap(topic => topic.modules || []), // Keep for backward compatibility
      // Skills are ONLY stored at Lesson level - aggregate from all lessons
      skills: [...new Set((await Promise.all(
        topics.flatMap(async (topic) => {
          const topicModules = await moduleRepository.findByTopicId(topic.id);
          const topicLessonsArrays = await Promise.all(
            topicModules.map(async (module) => {
              return await lessonRepository.findByModuleId(module.id);
            })
          );
          return topicLessonsArrays.flat();
        })
      )).flat().flatMap(lesson => Array.isArray(lesson.skills) ? lesson.skills : []))],
      version: versionNumber.toString(),
      ai_assets: course.ai_assets || {}, // Include course-level AI assets
      metadata: metadata, // Include metadata with proper defaults
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
    // Check if course exists and is active
    const course = await courseRepository.findById(courseId);
    if (!course || course.status !== 'active') {
      const error = new Error('Course not found or not available');
      error.status = 404;
      throw error;
    }

    // Check if already registered
    const existing = await registrationRepository.findByLearnerAndCourse(learner_id, courseId);
    if (existing) {
      const error = new Error('Learner is already registered for this course');
      error.code = '23505';
      throw error;
    }

    // Create registration
    const registration = await registrationRepository.create({
      learner_id,
      learner_name,
      learner_company: learner_company || company_id || null,
      course_id: courseId,
      company_id: company_id || null,
      status: 'in_progress'
    });

    // Update course studentsIDDictionary
    const studentsDict = course.studentsIDDictionary || {};
    studentsDict[learner_id] = {
      status: 'in_progress',
      enrolled_date: new Date().toISOString(),
      completed_date: null,
      completion_reason: null
    };
    await courseRepository.update(courseId, { studentsIDDictionary: studentsDict });

    return {
      status: 'registered',
      registration_id: registration.id,
      course_id: courseId,
      learner_id: learner_id,
      registered_at: registration.enrolled_date?.toISOString() || new Date().toISOString(),
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
      const course = await courseRepository.findById(courseId);
      if (!course) {
        const error = new Error('Course not found');
        error.status = 404;
        throw error;
      }

      const registration = await registrationRepository.findByLearnerAndCourse(learner_id, courseId);
      if (!registration) {
        const error = new Error('Learner is not registered for this course');
        error.status = 404;
        throw error;
      }

      const lesson = await lessonRepository.findById(lesson_id);
      if (!lesson) {
        const error = new Error('Lesson not found');
        error.status = 404;
        throw error;
      }

      // Verify lesson belongs to course
      const module = await moduleRepository.findById(lesson.module_id);
      const topic = await topicRepository.findById(module.topic_id);
      if (topic.course_id !== courseId) {
        const error = new Error('Lesson not found in course');
        error.status = 404;
        throw error;
      }

      // Update lesson_completion_dictionary
      const completionDict = course.lesson_completion_dictionary || {};
      if (!completionDict[lesson_id]) {
        completionDict[lesson_id] = {
          topic_id: lesson.topic_id,
          topic_name: topic.topic_name,
          trainer_ids: lesson.trainer_ids || []
        };
      }
      
      if (!completionDict[lesson_id][learner_id]) {
        completionDict[lesson_id][learner_id] = {};
      }
      
      completionDict[lesson_id][learner_id] = {
        status: completed ? 'completed' : 'in_progress',
        completed_at: completed ? new Date().toISOString() : null
      };

      await courseRepository.update(courseId, { lesson_completion_dictionary: completionDict });

      // Calculate progress
      const totalLessons = await t.one(
        `SELECT COUNT(*)::int AS total
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         JOIN topics t ON t.id = m.topic_id
         WHERE t.course_id = $1`,
        [courseId]
      );

      const completedCount = Object.values(completionDict).filter(
        lessonData => lessonData[learner_id] && lessonData[learner_id].status === 'completed'
      ).length;

      const rawProgress = totalLessons.total > 0 ? (completedCount / totalLessons.total) * 100 : 0;
      const progress = Number(rawProgress.toFixed(2));
      const status = progress >= 100 ? 'completed' : 'in_progress';

      // Update registration
      await registrationRepository.update(registration.id, {
        status,
        completed_date: progress >= 100 ? new Date() : null
      });

      // Update course studentsIDDictionary
      const studentsDict = course.studentsIDDictionary || {};
      if (studentsDict[learner_id]) {
        studentsDict[learner_id].status = status;
        if (progress >= 100) {
          studentsDict[learner_id].completed_date = new Date().toISOString();
          studentsDict[learner_id].completion_reason = 'completed';
        }
      }
      await courseRepository.update(courseId, { studentsIDDictionary: studentsDict });

      const completedLessonIds = Object.entries(completionDict)
        .filter(([_, lessonData]) => lessonData[learner_id] && lessonData[learner_id].status === 'completed')
        .map(([lessonId, _]) => lessonId);

      return {
        course_id: courseId,
        learner_id,
        registration_id: registration.id,
        lesson_id,
        completed,
        progress,
        status,
        total_lessons: totalLessons.total,
        completed_lessons: completedLessonIds
      };
    });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    throw error;
  }
};

/**
 * Get all courses (CRUD: Read all)
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
 */
export const getCourseById = async (courseId, options = {}) => {
  return getCourseDetails(courseId, options);
};

/**
 * Create course (CRUD: Create)
 */
export const createCourse = async (courseData) => {
  try {
    // Set default metadata for marketplace courses (trainer-created)
    const defaultMetadata = {
      personalized: false,
      source: 'marketplace',
      ...(courseData.metadata || {})
    }
    
    const course = await courseRepository.create({
      course_name: courseData.course_name,
      course_description: courseData.course_description,
      course_type: courseData.course_type || 'trainer',
      status: 'draft',
      level: courseData.level,
      duration_hours: courseData.duration_hours,
      created_by_user_id: courseData.created_by_user_id || courseData.trainer_id,
      learning_path_designation: defaultMetadata // Store metadata in learning_path_designation
    });

    // Create initial version
    await versionRepository.create({
      entity_type: 'course',
      entity_id: course.id,
      data: course.toJSON()
    });

    return {
      course_id: course.id,
      id: course.id,
      status: 'draft',
      created_at: course.created_at?.toISOString() || new Date().toISOString()
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
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    const updateData = {};
    if (updates.course_name !== undefined) updateData.course_name = updates.course_name;
    if (updates.course_description !== undefined) updateData.course_description = updates.course_description;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.duration_hours !== undefined) updateData.duration_hours = updates.duration_hours;
    if (updates.status !== undefined) updateData.status = updates.status;

    if (Object.keys(updateData).length === 0) {
      return { course_id: courseId, id: courseId, status: 'unchanged' };
    }

    const updatedCourse = await courseRepository.update(courseId, updateData);

    // Create new version
    const latestVersion = await versionRepository.findLatestVersion('course', courseId);
    const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
    
    await versionRepository.create({
      entity_type: 'course',
      entity_id: courseId,
      data: updatedCourse.toJSON()
    });

    return {
      course_id: courseId,
      id: courseId,
      status: 'updated',
      version_number: versionNumber,
      updated_at: updatedCourse.updated_at?.toISOString() || new Date().toISOString()
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
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    await courseRepository.update(courseId, { status: 'active' });

    // Update latest version
    const latestVersion = await versionRepository.findLatestVersion('course', courseId);
    if (latestVersion) {
      const versionData = latestVersion.data || {};
      versionData.status = 'published';
      versionData.published_at = new Date().toISOString();
      // Note: VersionRepository doesn't have update method, so we create a new version
      await versionRepository.create({
        entity_type: 'course',
        entity_id: courseId,
        data: versionData
      });
    }

    return {
      course_id: courseId,
      id: courseId,
      status: 'active',
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
    const course = await courseRepository.findById(courseId);
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

    // Store scheduled publish time in learning_path_designation or create a scheduled field
    // For now, we'll just set status to draft and store in a custom field
    // Note: This might need a migration to add scheduled_publish_at column
    await courseRepository.update(courseId, { 
      status: 'draft',
      // Store in learning_path_designation temporarily
      learning_path_designation: {
        ...(course.learning_path_designation || {}),
        scheduled_publish_at: publishAt
      }
    });

    return {
      course_id: courseId,
      id: courseId,
      status: 'draft',
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
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    await courseRepository.update(courseId, { status: 'draft' }); // Keep as draft until published

    return {
      course_id: courseId,
      id: courseId,
      status: 'draft',
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
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    await courseRepository.update(courseId, { status: 'archived' });

    return {
      course_id: courseId,
      id: courseId,
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
    const versions = await versionRepository.findByEntity('course', courseId);

    return {
      course_id: courseId,
      id: courseId,
      versions: versions.map(v => ({
        version_number: v.version_number,
        version_no: v.version_number, // For backward compatibility
        created_at: v.created_at?.toISOString() || null,
        data: v.data || {}
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
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) {
      return null;
    }

    const module = await moduleRepository.findById(lesson.module_id);
    const topic = await topicRepository.findById(module.topic_id);
    const course = await courseRepository.findById(topic.course_id);

    return {
      id: lesson.id,
      title: lesson.lesson_name,
      description: lesson.lesson_description,
      content_type: lesson.content_type,
      // Full lesson content (from Content Studio) - ALWAYS arrays
      content_data: Array.isArray(lesson.content_data) ? lesson.content_data : [],
      devlab_exercises: Array.isArray(lesson.devlab_exercises) ? lesson.devlab_exercises : [],
      skills: Array.isArray(lesson.skills) ? lesson.skills : [],
      trainer_ids: Array.isArray(lesson.trainer_ids) ? lesson.trainer_ids : [],
      module: {
        id: module.id,
        name: module.module_name
      },
      course: {
        id: course.id,
        title: course.course_name,
        name: course.course_name // Keep for backward compatibility
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
    const registrations = await registrationRepository.findByLearnerId(learnerId);

    const progressData = await Promise.all(
      registrations.map(async (reg) => {
        const course = await courseRepository.findById(reg.course_id);
        if (!course) return null;

        // Calculate rating from feedback
        const ratingResult = await db.oneOrNone(
          'SELECT AVG(rating)::numeric as avg FROM feedback WHERE course_id = $1',
          [reg.course_id]
        );

        // Count lessons
        const lessonsCount = await db.one(
          `SELECT COUNT(*)::int as total
           FROM lessons l
           JOIN modules m ON m.id = l.module_id
           JOIN topics t ON t.id = m.topic_id
           WHERE t.course_id = $1`,
          [reg.course_id]
        );

        // Calculate progress from lesson_completion_dictionary
        const completionDict = course.lesson_completion_dictionary || {};
        const completedLessons = Object.values(completionDict).filter(
          lessonData => lessonData[learnerId] && lessonData[learnerId].status === 'completed'
        ).length;
        const progress = lessonsCount.total > 0 
          ? (completedLessons / lessonsCount.total) * 100 
          : 0;

        return {
          course_id: reg.course_id,
          id: reg.course_id,
          title: course.course_name,
          progress: Number(progress.toFixed(2)),
          status: reg.status,
          enrolled_at: reg.enrolled_date?.toISOString() || null,
          level: course.level,
          rating: parseFloat(ratingResult?.avg) || 0,
          lessons_total: lessonsCount.total || 0
        };
      })
    );

    return progressData.filter(Boolean);
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
    const [levels] = await Promise.all([
      db.any(`SELECT DISTINCT level FROM courses WHERE status = 'active' AND level IS NOT NULL ORDER BY level`)
    ]);

    return {
      levels: levels.map(l => l.level).filter(Boolean),
      categories: [], // Not in new schema
      tags: [] // Not in new schema
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
