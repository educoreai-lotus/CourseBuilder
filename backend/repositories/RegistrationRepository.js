/**
 * Registration Repository
 */

import db from '../config/database.js';
import { Registration } from '../models/Registration.js';
import { v4 as uuidv4 } from 'uuid';

export class RegistrationRepository {
  async create(registrationData) {
    const registrationId = uuidv4();
    const query = `
      INSERT INTO registrations (
        id, learner_id, learner_name, course_id, company_id, company_name, status, enrolled_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      registrationId,
      registrationData.learner_id,
      registrationData.learner_name || null,
      registrationData.course_id,
      registrationData.company_id || null,
      registrationData.company_name || null,
      registrationData.status || 'in_progress',
      registrationData.enrolled_date || new Date()
    ];
    const row = await db.one(query, values);
    return Registration.fromRow(row);
  }

  async findById(registrationId) {
    const query = 'SELECT * FROM registrations WHERE id = $1';
    const row = await db.oneOrNone(query, [registrationId]);
    return row ? Registration.fromRow(row) : null;
  }

  async findByLearnerAndCourse(learnerId, courseId) {
    const query = 'SELECT * FROM registrations WHERE learner_id = $1 AND course_id = $2';
    const row = await db.oneOrNone(query, [learnerId, courseId]);
    return row ? Registration.fromRow(row) : null;
  }

  async findByLearnerId(learnerId) {
    const query = 'SELECT * FROM registrations WHERE learner_id = $1 ORDER BY enrolled_date DESC';
    const rows = await db.any(query, [learnerId]);
    return rows.map(row => Registration.fromRow(row));
  }

  async findByCourseId(courseId) {
    const query = 'SELECT * FROM registrations WHERE course_id = $1 ORDER BY enrolled_date DESC';
    const rows = await db.any(query, [courseId]);
    return rows.map(row => Registration.fromRow(row));
  }

  async update(registrationId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.completed_date !== undefined) {
      updateFields.push(`completed_date = $${paramIndex++}`);
      values.push(updates.completed_date);
    }

    if (updateFields.length === 0) {
      return await this.findById(registrationId);
    }

    values.push(registrationId);
    const query = `
      UPDATE registrations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const row = await db.one(query, values);
    return Registration.fromRow(row);
  }

  async delete(registrationId) {
    const query = 'DELETE FROM registrations WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [registrationId]);
    return row ? Registration.fromRow(row) : null;
  }
}

export default new RegistrationRepository();


