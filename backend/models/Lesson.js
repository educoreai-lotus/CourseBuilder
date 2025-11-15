/**
 * Lesson Model
 */

export class Lesson {
  constructor(data) {
    this.id = data.id;
    this.module_id = data.module_id;
    this.topic_id = data.topic_id;
    this.lesson_name = data.lesson_name;
    this.lesson_description = data.lesson_description;
    // Skills are ONLY stored at Lesson level - from Content Studio
    this.skills = Array.isArray(data.skills) ? data.skills : [];
    // Trainer IDs from Content Studio
    this.trainer_ids = Array.isArray(data.trainer_ids) ? data.trainer_ids : [];
    this.content_type = data.content_type;
    // Content Studio contents[] array - ALWAYS an array, never an object
    this.content_data = Array.isArray(data.content_data) ? data.content_data : [];
    // DevLab exercises from Content Studio - ALWAYS an array
    this.devlab_exercises = Array.isArray(data.devlab_exercises) ? data.devlab_exercises : [];
  }

  static fromRow(row) {
    return new Lesson({
      id: row.id,
      module_id: row.module_id,
      topic_id: row.topic_id,
      lesson_name: row.lesson_name,
      lesson_description: row.lesson_description,
      // Normalize JSONB arrays - ensure they're arrays
      skills: Array.isArray(row.skills) ? row.skills : (row.skills ? [row.skills] : []),
      trainer_ids: Array.isArray(row.trainer_ids) ? row.trainer_ids : [],
      content_type: row.content_type,
      // content_data must ALWAYS be an array (Content Studio contents[] array)
      content_data: Array.isArray(row.content_data) ? row.content_data : (row.content_data ? [row.content_data] : []),
      // devlab_exercises must ALWAYS be an array
      devlab_exercises: Array.isArray(row.devlab_exercises) ? row.devlab_exercises : (row.devlab_exercises ? [row.devlab_exercises] : [])
    });
  }

  toJSON() {
    return {
      id: this.id,
      module_id: this.module_id,
      topic_id: this.topic_id,
      lesson_name: this.lesson_name,
      lesson_description: this.lesson_description,
      skills: this.skills,
      trainer_ids: this.trainer_ids,
      content_type: this.content_type,
      content_data: this.content_data,
      devlab_exercises: this.devlab_exercises
    };
  }
}


