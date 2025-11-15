/**
 * Topic Repository
 */

import db from '../config/database.js';
import { Topic } from '../models/Topic.js';
import { v4 as uuidv4 } from 'uuid';

export class TopicRepository {
  async create(topicData) {
    const topicId = uuidv4();
    const query = `
      INSERT INTO topics (id, course_id, topic_name, topic_description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      topicId,
      topicData.course_id,
      topicData.topic_name,
      topicData.topic_description || null
    ];
    const row = await db.one(query, values);
    return Topic.fromRow(row);
  }

  async findById(topicId) {
    const query = 'SELECT * FROM topics WHERE id = $1';
    const row = await db.oneOrNone(query, [topicId]);
    return row ? Topic.fromRow(row) : null;
  }

  async findByCourseId(courseId) {
    const query = 'SELECT * FROM topics WHERE course_id = $1 ORDER BY topic_name';
    const rows = await db.any(query, [courseId]);
    return rows.map(row => Topic.fromRow(row));
  }

  async update(topicId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.topic_name !== undefined) {
      updateFields.push(`topic_name = $${paramIndex++}`);
      values.push(updates.topic_name);
    }

    if (updates.topic_description !== undefined) {
      updateFields.push(`topic_description = $${paramIndex++}`);
      values.push(updates.topic_description);
    }

    if (updateFields.length === 0) {
      return await this.findById(topicId);
    }

    values.push(topicId);
    const query = `
      UPDATE topics 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const row = await db.one(query, values);
    return Topic.fromRow(row);
  }

  async delete(topicId) {
    const query = 'DELETE FROM topics WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [topicId]);
    return row ? Topic.fromRow(row) : null;
  }
}

export default new TopicRepository();


