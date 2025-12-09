/**
 * Scheduled Publishing Service
 * Background job to check and publish scheduled courses
 */

import db from '../config/database.js';
import { coursesService } from './courses.service.js';

/**
 * Find all courses scheduled for publishing
 */
export const findScheduledCourses = async () => {
  try {
    const query = `
      SELECT 
        id,
        course_name,
        learning_path_designation,
        status
      FROM courses
      WHERE 
        status = 'draft'
        AND learning_path_designation->>'scheduled_publish_at' IS NOT NULL
        AND (learning_path_designation->>'scheduled_publish_at')::timestamp <= NOW()
    `;

    const courses = await db.any(query);
    return courses;
  } catch (error) {
    // Handle missing tables gracefully (database not migrated yet)
    if (error.code === '42P01') {
      console.warn('⚠️  Database tables not found. Skipping scheduled publishing check. Run migrations first.');
      return [];
    }
    console.error('Error finding scheduled courses:', error);
    throw error;
  }
};

/**
 * Process scheduled publications
 */
export const processScheduledPublications = async () => {
  try {
    const scheduledCourses = await findScheduledCourses();
    
    if (scheduledCourses.length === 0) {
      return { processed: 0, errors: [] };
    }

    const results = {
      processed: 0,
      errors: []
    };

    for (const course of scheduledCourses) {
      try {
        // Publish the course
        await coursesService.publishCourse(course.id);
        
        // Clear scheduled_publish_at from learning_path_designation
        const designation = course.learning_path_designation || {};
        delete designation.scheduled_publish_at;
        
        await db.none(
          `UPDATE courses 
           SET learning_path_designation = $1::jsonb
           WHERE id = $2`,
          [JSON.stringify(designation), course.id]
        );

        console.log(`✅ Published scheduled course: ${course.course_name} (${course.id})`);
        results.processed++;
      } catch (error) {
        console.error(`❌ Error publishing scheduled course ${course.id}:`, error);
        results.errors.push({
          courseId: course.id,
          courseName: course.course_name,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    // Handle missing tables gracefully (database not migrated yet)
    if (error.code === '42P01') {
      console.warn('⚠️  Database tables not found. Skipping scheduled publishing. Run migrations first.');
      return { processed: 0, errors: [] };
    }
    console.error('Error processing scheduled publications:', error);
    throw error;
  }
};

/**
 * Start the scheduled publishing job
 * Runs every minute to check for courses ready to publish
 */
export const startScheduledPublishingJob = () => {
  const INTERVAL_MS = 60 * 1000; // 1 minute

  console.log('🕐 Starting scheduled publishing job (runs every minute)');

  // Run immediately on start
  processScheduledPublications().catch(err => {
    console.error('Error in initial scheduled publishing check:', err);
  });

  // Then run every minute
  const intervalId = setInterval(() => {
    processScheduledPublications().catch(err => {
      console.error('Error in scheduled publishing job:', err);
    });
  }, INTERVAL_MS);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('🛑 Stopped scheduled publishing job');
  };
};

export default {
  findScheduledCourses,
  processScheduledPublications,
  startScheduledPublishingJob
};

