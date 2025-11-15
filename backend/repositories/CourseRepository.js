/**
 * Course Repository
 * Handles all database operations for courses
 */

import db from '../config/database.js';
import { Course } from '../models/Course.js';
import { v4 as uuidv4 } from 'uuid';

export class CourseRepository {
  /**
   * Create a new course
   */
  async create(courseData) {
    const courseId = uuidv4();
    const query = `
      INSERT INTO courses (
        id, course_name, course_description, course_type, status, level,
        duration_hours, start_date, created_by_user_id,
        learning_path_designation,
        studentsIDDictionary, feedbackDictionary, lesson_completion_dictionary
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;
    
    const values = [
      courseId,
      courseData.course_name,
      courseData.course_description || null,
      courseData.course_type,
      courseData.status || 'draft',
      courseData.level || null,
      courseData.duration_hours || null,
      courseData.start_date || null,
      courseData.created_by_user_id || null,
      JSON.stringify(courseData.learning_path_designation || {}),
      JSON.stringify(courseData.studentsIDDictionary || {}),
      JSON.stringify(courseData.feedbackDictionary || {}),
      JSON.stringify(courseData.lesson_completion_dictionary || {})
    ];

    const row = await db.one(query, values);
    return Course.fromRow(row);
  }

  /**
   * Find course by ID
   */
  async findById(courseId) {
    const query = 'SELECT * FROM courses WHERE id = $1';
    const row = await db.oneOrNone(query, [courseId]);
    return row ? Course.fromRow(row) : null;
  }

  /**
   * Find all courses with filters
   */
  async findAll(filters = {}) {
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.course_type) {
      query += ` AND course_type = $${paramIndex++}`;
      params.push(filters.course_type);
    }

    if (filters.level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(filters.level);
    }

    if (filters.created_by_user_id) {
      query += ` AND created_by_user_id = $${paramIndex++}`;
      params.push(filters.created_by_user_id);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const rows = await db.any(query, params);
    return rows.map(row => Course.fromRow(row));
  }

  /**
   * Update course
   */
  async update(courseId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.course_name !== undefined) {
      updateFields.push(`course_name = $${paramIndex++}`);
      values.push(updates.course_name);
    }

    if (updates.course_description !== undefined) {
      updateFields.push(`course_description = $${paramIndex++}`);
      values.push(updates.course_description);
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.level !== undefined) {
      updateFields.push(`level = $${paramIndex++}`);
      values.push(updates.level);
    }

    if (updates.learning_path_designation !== undefined) {
      updateFields.push(`learning_path_designation = $${paramIndex++}`);
      values.push(JSON.stringify(updates.learning_path_designation));
    }

    if (updates.studentsIDDictionary !== undefined) {
      updateFields.push(`studentsIDDictionary = $${paramIndex++}`);
      values.push(JSON.stringify(updates.studentsIDDictionary));
    }

    if (updates.feedbackDictionary !== undefined) {
      updateFields.push(`feedbackDictionary = $${paramIndex++}`);
      values.push(JSON.stringify(updates.feedbackDictionary));
    }

    if (updates.lesson_completion_dictionary !== undefined) {
      updateFields.push(`lesson_completion_dictionary = $${paramIndex++}`);
      values.push(JSON.stringify(updates.lesson_completion_dictionary));
    }

    if (updateFields.length === 0) {
      return await this.findById(courseId);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(courseId);

    const query = `
      UPDATE courses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.one(query, values);
    return Course.fromRow(row);
  }

  /**
   * Delete course
   */
  async delete(courseId) {
    const query = 'DELETE FROM courses WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [courseId]);
    return row ? Course.fromRow(row) : null;
  }

  /**
   * Update student in studentsIDDictionary
   */
  async updateStudentDictionary(courseId, studentId, studentData) {
    const course = await this.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const dictionary = course.studentsIDDictionary || {};
    dictionary[studentId] = {
      ...dictionary[studentId],
      ...studentData,
      updated_at: new Date().toISOString()
    };

    return await this.update(courseId, { studentsIDDictionary: dictionary });
  }

  /**
   * Update feedback in feedbackDictionary
   */
  async updateFeedbackDictionary(courseId, userId, feedbackData) {
    const course = await this.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const dictionary = course.feedbackDictionary || {};
    dictionary[userId] = {
      ...dictionary[userId],
      ...feedbackData,
      submitted_at: new Date().toISOString()
    };

    return await this.update(courseId, { feedbackDictionary: dictionary });
  }
}

export default new CourseRepository();


