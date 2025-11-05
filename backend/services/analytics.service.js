import db from '../config/database.js';

/**
 * Prepare payload for /analytics/learning-data endpoint
 * Includes course stats: totalEnrollments, completionRate, averageRating
 */
export const prepareLearningAnalyticsPayload = async (courseIds = null) => {
  try {
    let query = `
      SELECT 
        c.course_id,
        c.course_name,
        c.level,
        c.duration,
        c.total_enrollments as "totalEnrollments",
        c.active_enrollments as "activeEnrollment",
        c.completion_rate as "completionRate",
        c.average_rating as "averageRating",
        c.created_at as "createdAt"
      FROM courses c
      WHERE c.status = 'live'
    `;
    const params = [];

    if (courseIds && courseIds.length > 0) {
      query += ` AND c.course_id = ANY($1)`;
      params.push(courseIds);
    }

    const courses = await db.any(query, params);

    // Fetch feedback dictionary for each course
    const coursesWithFeedback = await Promise.all(
      courses.map(async (course) => {
        // Get feedback for this course
        const feedbacks = await db.any(
          `SELECT 
            learner_id as user_id,
            rating,
            tags,
            comment
          FROM feedback
          WHERE course_id = $1`,
          [course.course_id]
        );

        const feedbackDictionary = {};
        feedbacks.forEach(f => {
          feedbackDictionary[f.user_id] = {
            rating: parseFloat(f.rating),
            tags: f.tags || [],
            comment: f.comment || ''
          };
        });

        // Get lesson completion dictionary
        const lessonCompletions = await db.any(
          `SELECT 
            l.lesson_id,
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM registrations r 
                WHERE r.course_id = $1 
                AND r.progress = 100 
                AND r.status = 'completed'
              ) THEN 'learned'
              ELSE 'notlearned'
            END as status
          FROM lessons l
          JOIN modules m ON l.module_id = m.module_id
          WHERE m.course_id = $1`,
          [course.course_id]
        );

        const lessonCompletionDictionary = {};
        lessonCompletions.forEach(lc => {
          lessonCompletionDictionary[lc.lesson_id] = lc.status;
        });

        // Get students ID dictionary
        const registrations = await db.any(
          `SELECT 
            learner_id,
            CASE 
              WHEN status = 'completed' THEN 'completed'
              WHEN status = 'in_progress' THEN 'in_progress'
              WHEN status = 'failed' THEN 'failed'
              ELSE 'in_progress'
            END as status
          FROM registrations
          WHERE course_id = $1`,
          [course.course_id]
        );

        const studentsIDDictionary = {};
        registrations.forEach(r => {
          studentsIDDictionary[r.learner_id] = r.status;
        });

        // Get trainer ID list
        const trainers = await db.any(
          `SELECT DISTINCT trainer_id 
          FROM courses 
          WHERE course_id = $1 AND trainer_id IS NOT NULL`,
          [course.course_id]
        );

        const trainerIDList = trainers.map(t => t.trainer_id);

        // Get learning path from metadata
        const metadata = await db.oneOrNone(
          'SELECT metadata FROM courses WHERE course_id = $1',
          [course.course_id]
        );

        const learningPath = metadata?.metadata?.skills ? {
          target_competency: metadata.metadata.skills || [],
          current_competency: [],
          skills: metadata.metadata.skills || []
        } : {
          target_competency: [],
          current_competency: [],
          skills: []
        };

        return {
          course_id: course.course_id,
          course_name: course.course_name,
          level: course.level || null,
          duration: course.duration ? `${course.duration} minutes` : null,
          totalEnrollments: parseInt(course.totalEnrollments || 0, 10),
          activeEnrollment: parseInt(course.activeEnrollment || 0, 10),
          completionRate: parseFloat(course.completionRate || 0),
          averageRating: parseFloat(course.averageRating || 0),
          createdAt: course.createdAt.toISOString(),
          feedbackDictionary,
          trainerIDList,
          lesson_completion_dictionary: lessonCompletionDictionary,
          studentsIDDictionary,
          learning_path: learningPath
        };
      })
    );

    return {
      courses: coursesWithFeedback
    };
  } catch (error) {
    console.error('Error preparing learning analytics payload:', error);
    throw error;
  }
};

/**
 * Send learning analytics data (mock implementation)
 * In production, this would make an HTTP request to Learning Analytics service
 */
export const sendLearningAnalytics = async (courseIds = null) => {
  try {
    const payload = await prepareLearningAnalyticsPayload(courseIds);
    
    // Mock: In production, make REST API call to Learning Analytics service
    // const response = await fetch('https://analytics-service/api/v1/learning-data', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    
    console.log('📊 Learning Analytics payload prepared:', {
      courseCount: payload.courses.length,
      timestamp: new Date().toISOString()
    });

    return {
      status: 'success',
      records: payload.courses.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending learning analytics:', error);
    throw error;
  }
};

/**
 * Prepare HR report payload (simplified version)
 */
export const prepareHRReportPayload = async (courseIds = null) => {
  try {
    let query = `
      SELECT 
        c.course_id,
        c.course_name,
        c.level,
        c.duration,
        c.total_enrollments as "totalEnrollments",
        c.active_enrollments as "activeEnrollment",
        c.completion_rate as "completionRate",
        c.average_rating as "averageRating",
        c.created_at as "createdAt"
      FROM courses c
      WHERE c.status = 'live'
    `;
    const params = [];

    if (courseIds && courseIds.length > 0) {
      query += ` AND c.course_id = ANY($1)`;
      params.push(courseIds);
    }

    const courses = await db.any(query, params);

    const coursesWithFeedback = await Promise.all(
      courses.map(async (course) => {
        const feedbacks = await db.any(
          `SELECT 
            learner_id as user_id,
            rating,
            tags,
            comment
          FROM feedback
          WHERE course_id = $1`,
          [course.course_id]
        );

        const feedbackDictionary = {};
        feedbacks.forEach(f => {
          feedbackDictionary[f.user_id] = {
            rating: parseFloat(f.rating),
            tags: f.tags || [],
            comment: f.comment || ''
          };
        });

        return {
          course_id: course.course_id,
          course_name: course.course_name,
          level: course.level || null,
          duration: course.duration ? `${course.duration} minutes` : null,
          totalEnrollments: parseInt(course.totalEnrollments || 0, 10),
          activeEnrollment: parseInt(course.activeEnrollment || 0, 10),
          completionRate: parseFloat(course.completionRate || 0),
          averageRating: parseFloat(course.averageRating || 0),
          createdAt: course.createdAt.toISOString(),
          feedbackDictionary
        };
      })
    );

    return {
      courses: coursesWithFeedback
    };
  } catch (error) {
    console.error('Error preparing HR report payload:', error);
    throw error;
  }
};

/**
 * Send HR report (mock implementation)
 */
export const sendHRReport = async (courseIds = null) => {
  try {
    const payload = await prepareHRReportPayload(courseIds);
    
    // Mock: In production, make REST API call to HR service
    console.log('📋 HR Report payload prepared:', {
      courseCount: payload.courses.length,
      timestamp: new Date().toISOString()
    });

    return {
      status: 'success',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending HR report:', error);
    throw error;
  }
};

export const analyticsService = {
  prepareLearningAnalyticsPayload,
  sendLearningAnalytics,
  prepareHRReportPayload,
  sendHRReport
};

