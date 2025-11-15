/**
 * Assessment Repository
 */

import db from '../config/database.js';
import { Assessment } from '../models/Assessment.js';
import { v4 as uuidv4 } from 'uuid';

export class AssessmentRepository {
  async create(assessmentData) {
    const assessmentId = uuidv4();
    const query = `
      INSERT INTO assessments (
        id, learner_id, learner_name, course_id, exam_type,
        passing_grade, final_grade, passed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      assessmentId,
      assessmentData.learner_id,
      assessmentData.learner_name || null,
      assessmentData.course_id,
      assessmentData.exam_type || 'postcourse',
      assessmentData.passing_grade || 70.00,
      assessmentData.final_grade || null,
      assessmentData.passed || null
      // Note: coverage_map is NOT stored - built dynamically when sending to Assessment microservice
    ];
    const row = await db.one(query, values);
    return Assessment.fromRow(row);
  }

  async findById(assessmentId) {
    const query = 'SELECT * FROM assessments WHERE id = $1';
    const row = await db.oneOrNone(query, [assessmentId]);
    return row ? Assessment.fromRow(row) : null;
  }

  async findByLearnerAndCourse(learnerId, courseId) {
    const query = 'SELECT * FROM assessments WHERE learner_id = $1 AND course_id = $2 ORDER BY id DESC LIMIT 1';
    const row = await db.oneOrNone(query, [learnerId, courseId]);
    return row ? Assessment.fromRow(row) : null;
  }

  async findByLearnerId(learnerId) {
    const query = 'SELECT * FROM assessments WHERE learner_id = $1 ORDER BY id DESC';
    const rows = await db.any(query, [learnerId]);
    return rows.map(row => Assessment.fromRow(row));
  }

  async findByCourseId(courseId) {
    const query = 'SELECT * FROM assessments WHERE course_id = $1 ORDER BY id DESC';
    const rows = await db.any(query, [courseId]);
    return rows.map(row => Assessment.fromRow(row));
  }
}

export default new AssessmentRepository();

