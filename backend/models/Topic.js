/**
 * Topic Model
 */

export class Topic {
  constructor(data) {
    this.id = data.id;
    this.course_id = data.course_id;
    this.topic_name = data.topic_name;
    this.topic_description = data.topic_description;
    // Skills are ONLY stored at the Lesson level (lessons.skills)
    // If topic-level skills are needed, they are computed dynamically by aggregating from lessons
  }

  static fromRow(row) {
    return new Topic({
      id: row.id,
      course_id: row.course_id,
      topic_name: row.topic_name,
      topic_description: row.topic_description
    });
  }

  toJSON() {
    return {
      id: this.id,
      course_id: this.course_id,
      topic_name: this.topic_name,
      topic_description: this.topic_description
    };
  }
}


