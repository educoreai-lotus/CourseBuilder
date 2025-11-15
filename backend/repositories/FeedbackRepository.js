/**
 * Feedback Repository
 */

import db from '../config/database.js';
import { Feedback } from '../models/Feedback.js';
import { v4 as uuidv4 } from 'uuid';

export class FeedbackRepository {
  async create(feedbackData) {
    const feedbackId = uuidv4();
    const query = `
      INSERT INTO feedback (id, learner_id, course_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      feedbackId,
      feedbackData.learner_id,
      feedbackData.course_id,
      feedbackData.rating,
      feedbackData.comment || null
      // Note: course_name is NOT stored - looked up from course_id when sending to Directory
    ];
    const row = await db.one(query, values);
    return Feedback.fromRow(row);
  }

  async findById(feedbackId) {
    const query = 'SELECT * FROM feedback WHERE id = $1';
    const row = await db.oneOrNone(query, [feedbackId]);
    return row ? Feedback.fromRow(row) : null;
  }

  async findByLearnerAndCourse(learnerId, courseId) {
    const query = 'SELECT * FROM feedback WHERE learner_id = $1 AND course_id = $2';
    const row = await db.oneOrNone(query, [learnerId, courseId]);
    return row ? Feedback.fromRow(row) : null;
  }

  async findByCourseId(courseId) {
    const query = 'SELECT * FROM feedback WHERE course_id = $1 ORDER BY submitted_at DESC';
    const rows = await db.any(query, [courseId]);
    return rows.map(row => Feedback.fromRow(row));
  }

  async update(feedbackId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.rating !== undefined) {
      updateFields.push(`rating = $${paramIndex++}`);
      values.push(updates.rating);
    }

    if (updates.comment !== undefined) {
      updateFields.push(`comment = $${paramIndex++}`);
      values.push(updates.comment);
    }

    if (updateFields.length === 0) {
      return await this.findById(feedbackId);
    }

    values.push(feedbackId);
    const query = `
      UPDATE feedback 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const row = await db.one(query, values);
    return Feedback.fromRow(row);
  }

  async delete(feedbackId) {
    const query = 'DELETE FROM feedback WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [feedbackId]);
    return row ? Feedback.fromRow(row) : null;
  }
}

export default new FeedbackRepository();

