/**
 * Version Repository
 * Tracks historical versions of courses, topics, modules, and lessons
 */

import db from '../config/database.js';
import { Version } from '../models/Version.js';
import { v4 as uuidv4 } from 'uuid';

export class VersionRepository {
  async create(versionData) {
    const versionId = uuidv4();
    
    // Get next version number
    const maxVersion = await db.oneOrNone(
      'SELECT MAX(version_number) as max FROM versions WHERE entity_type = $1 AND entity_id = $2',
      [versionData.entity_type, versionData.entity_id]
    );
    const versionNumber = maxVersion?.max ? maxVersion.max + 1 : 1;

    const query = `
      INSERT INTO versions (id, entity_type, entity_id, version_number, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      versionId,
      versionData.entity_type,
      versionData.entity_id,
      versionNumber,
      JSON.stringify(versionData.data || {})
    ];
    const row = await db.one(query, values);
    return Version.fromRow(row);
  }

  async findById(versionId) {
    const query = 'SELECT * FROM versions WHERE id = $1';
    const row = await db.oneOrNone(query, [versionId]);
    return row ? Version.fromRow(row) : null;
  }

  async findByEntity(entityType, entityId) {
    const query = `
      SELECT * FROM versions 
      WHERE entity_type = $1 AND entity_id = $2 
      ORDER BY version_number DESC
    `;
    const rows = await db.any(query, [entityType, entityId]);
    return rows.map(row => Version.fromRow(row));
  }

  async findLatestVersion(entityType, entityId) {
    const query = `
      SELECT * FROM versions 
      WHERE entity_type = $1 AND entity_id = $2 
      ORDER BY version_number DESC 
      LIMIT 1
    `;
    const row = await db.oneOrNone(query, [entityType, entityId]);
    return row ? Version.fromRow(row) : null;
  }
}

export default new VersionRepository();









