/**
 * Registration Model
 */

export class Registration {
  constructor(data) {
    this.id = data.id;
    this.learner_id = data.learner_id;
    this.learner_name = data.learner_name;
    this.course_id = data.course_id;
    this.company_id = data.company_id;
    this.company_name = data.company_name;
    this.status = data.status; // 'completed' | 'in_progress' | 'failed'
    this.enrolled_date = data.enrolled_date;
    this.completed_date = data.completed_date;
  }

  static fromRow(row) {
    return new Registration({
      id: row.id,
      learner_id: row.learner_id,
      learner_name: row.learner_name,
      course_id: row.course_id,
      company_id: row.company_id,
      company_name: row.company_name,
      status: row.status,
      enrolled_date: row.enrolled_date,
      completed_date: row.completed_date
    });
  }

  toJSON() {
    return {
      id: this.id,
      learner_id: this.learner_id,
      learner_name: this.learner_name,
      course_id: this.course_id,
      company_id: this.company_id,
      company_name: this.company_name,
      status: this.status,
      enrolled_date: this.enrolled_date?.toISOString(),
      completed_date: this.completed_date?.toISOString()
    };
  }
}


