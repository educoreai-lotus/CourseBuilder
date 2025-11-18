/**
 * Lesson Repository
 */

import db from '../config/database.js';
import { Lesson } from '../models/Lesson.js';
import { v4 as uuidv4 } from 'uuid';

export class LessonRepository {
  async create(lessonData) {
    const lessonId = uuidv4();
    
    // Normalize Content Studio data - ensure arrays, not objects or strings
    const skills = Array.isArray(lessonData.skills) ? lessonData.skills : [];
    const trainer_ids = Array.isArray(lessonData.trainer_ids) ? lessonData.trainer_ids : [];
    // content_data must ALWAYS be an array (Content Studio contents[] array)
    const content_data = Array.isArray(lessonData.content_data) ? lessonData.content_data : [];
    // devlab_exercises must ALWAYS be an array (normalize empty string "" to [])
    const devlab_exercises = Array.isArray(lessonData.devlab_exercises) 
      ? lessonData.devlab_exercises 
      : (lessonData.devlab_exercises === "" || lessonData.devlab_exercises === null || lessonData.devlab_exercises === undefined)
        ? []
        : [lessonData.devlab_exercises];
    
    const query = `
      INSERT INTO lessons (
        id, module_id, topic_id, lesson_name, lesson_description,
        skills, trainer_ids, content_type, content_data, devlab_exercises
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid[], $8, $9, $10)
      RETURNING *
    `;
    const values = [
      lessonId,
      lessonData.module_id,
      lessonData.topic_id,
      lessonData.lesson_name,
      lessonData.lesson_description || null,
      JSON.stringify(skills),
      trainer_ids.length > 0 ? trainer_ids : [], // Cast to UUID[] in query
      lessonData.content_type || null,
      JSON.stringify(content_data),
      JSON.stringify(devlab_exercises)
    ];
    const row = await db.one(query, values);
    return Lesson.fromRow(row);
  }

  async findById(lessonId) {
    const query = 'SELECT * FROM lessons WHERE id = $1';
    const row = await db.oneOrNone(query, [lessonId]);
    return row ? Lesson.fromRow(row) : null;
  }

  async findByModuleId(moduleId) {
    const query = 'SELECT * FROM lessons WHERE module_id = $1 ORDER BY lesson_name';
    const rows = await db.any(query, [moduleId]);
    return rows.map(row => Lesson.fromRow(row));
  }

  async findByTopicId(topicId) {
    const query = 'SELECT * FROM lessons WHERE topic_id = $1 ORDER BY lesson_name';
    const rows = await db.any(query, [topicId]);
    return rows.map(row => Lesson.fromRow(row));
  }

  async update(lessonId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.lesson_name !== undefined) {
      updateFields.push(`lesson_name = $${paramIndex++}`);
      values.push(updates.lesson_name);
    }

    if (updates.lesson_description !== undefined) {
      updateFields.push(`lesson_description = $${paramIndex++}`);
      values.push(updates.lesson_description);
    }

    if (updates.skills !== undefined) {
      // Normalize skills - must be array
      const skills = Array.isArray(updates.skills) ? updates.skills : [];
      updateFields.push(`skills = $${paramIndex++}`);
      values.push(JSON.stringify(skills));
    }

    if (updates.trainer_ids !== undefined) {
      updateFields.push(`trainer_ids = $${paramIndex++}`);
      values.push(updates.trainer_ids);
    }

    if (updates.content_type !== undefined) {
      updateFields.push(`content_type = $${paramIndex++}`);
      values.push(updates.content_type);
    }

    if (updates.content_data !== undefined) {
      // Normalize content_data - must be array
      const content_data = Array.isArray(updates.content_data) ? updates.content_data : [];
      updateFields.push(`content_data = $${paramIndex++}`);
      values.push(JSON.stringify(content_data));
    }

    if (updates.devlab_exercises !== undefined) {
      // Normalize devlab_exercises - must be array (normalize empty string "" to [])
      const devlab_exercises = Array.isArray(updates.devlab_exercises)
        ? updates.devlab_exercises
        : (updates.devlab_exercises === "" || updates.devlab_exercises === null || updates.devlab_exercises === undefined)
          ? []
          : [updates.devlab_exercises];
      updateFields.push(`devlab_exercises = $${paramIndex++}`);
      values.push(JSON.stringify(devlab_exercises));
    }

    if (updateFields.length === 0) {
      return await this.findById(lessonId);
    }

    values.push(lessonId);
    const query = `
      UPDATE lessons 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const row = await db.one(query, values);
    return Lesson.fromRow(row);
  }

  async delete(lessonId) {
    const query = 'DELETE FROM lessons WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [lessonId]);
    return row ? Lesson.fromRow(row) : null;
  }
}

export default new LessonRepository();


