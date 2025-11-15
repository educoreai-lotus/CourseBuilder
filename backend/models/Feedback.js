/**
 * Feedback Model
 */

export class Feedback {
  constructor(data) {
    this.id = data.id;
    this.learner_id = data.learner_id;
    this.course_id = data.course_id;
    this.rating = data.rating; // 1-5
    this.comment = data.comment;
    this.submitted_at = data.submitted_at;
    // Note: course_name is NOT stored in DB - it's looked up from course_id
    // when sending to Directory microservice via directoryDTO builder
  }

  static fromRow(row) {
    return new Feedback({
      id: row.id,
      learner_id: row.learner_id,
      course_id: row.course_id,
      rating: row.rating,
      comment: row.comment,
      submitted_at: row.submitted_at
    });
  }

  toJSON() {
    return {
      id: this.id,
      learner_id: this.learner_id,
      course_id: this.course_id,
      rating: this.rating,
      comment: this.comment,
      submitted_at: this.submitted_at?.toISOString()
    };
  }
}

