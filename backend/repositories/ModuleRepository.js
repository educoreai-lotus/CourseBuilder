/**
 * Module Repository
 */

import db from '../config/database.js';
import { Module } from '../models/Module.js';
import { v4 as uuidv4 } from 'uuid';

export class ModuleRepository {
  async create(moduleData) {
    const moduleId = uuidv4();
    const query = `
      INSERT INTO modules (id, topic_id, module_name, module_description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      moduleId,
      moduleData.topic_id,
      moduleData.module_name,
      moduleData.module_description || null
    ];
    const row = await db.one(query, values);
    return Module.fromRow(row);
  }

  async findById(moduleId) {
    const query = 'SELECT * FROM modules WHERE id = $1';
    const row = await db.oneOrNone(query, [moduleId]);
    return row ? Module.fromRow(row) : null;
  }

  async findByTopicId(topicId) {
    const query = 'SELECT * FROM modules WHERE topic_id = $1 ORDER BY module_name';
    const rows = await db.any(query, [topicId]);
    return rows.map(row => Module.fromRow(row));
  }

  async update(moduleId, updates) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.module_name !== undefined) {
      updateFields.push(`module_name = $${paramIndex++}`);
      values.push(updates.module_name);
    }

    if (updates.module_description !== undefined) {
      updateFields.push(`module_description = $${paramIndex++}`);
      values.push(updates.module_description);
    }

    if (updateFields.length === 0) {
      return await this.findById(moduleId);
    }

    values.push(moduleId);
    const query = `
      UPDATE modules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const row = await db.one(query, values);
    return Module.fromRow(row);
  }

  async delete(moduleId) {
    const query = 'DELETE FROM modules WHERE id = $1 RETURNING *';
    const row = await db.oneOrNone(query, [moduleId]);
    return row ? Module.fromRow(row) : null;
  }
}

export default new ModuleRepository();






