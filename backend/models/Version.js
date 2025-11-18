/**
 * Version Model
 * Tracks historical versions of courses, topics, modules, and lessons
 */

export class Version {
  constructor(data) {
    this.id = data.id;
    this.entity_type = data.entity_type; // 'course' | 'topic' | 'module' | 'lesson'
    this.entity_id = data.entity_id;
    this.version_number = data.version_number;
    this.data = data.data || {};
    this.created_at = data.created_at;
  }

  static fromRow(row) {
    return new Version({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      version_number: row.version_number,
      data: row.data || {},
      created_at: row.created_at
    });
  }

  toJSON() {
    return {
      id: this.id,
      entity_type: this.entity_type,
      entity_id: this.entity_id,
      version_number: this.version_number,
      data: this.data,
      created_at: this.created_at?.toISOString()
    };
  }
}






