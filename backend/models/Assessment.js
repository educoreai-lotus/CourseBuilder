/**
 * Assessment Model
 */

export class Assessment {
  constructor(data) {
    this.id = data.id;
    this.learner_id = data.learner_id;
    this.learner_name = data.learner_name;
    this.course_id = data.course_id;
    this.exam_type = data.exam_type || 'postcourse';
    this.passing_grade = data.passing_grade || 70.00;
    this.final_grade = data.final_grade;
    this.passed = data.passed;
    // Note: coverage_map is NOT stored in DB - it's built dynamically from lessons
    // when sending to Assessment microservice via assessmentDTO builder
  }

  static fromRow(row) {
    return new Assessment({
      id: row.id,
      learner_id: row.learner_id,
      learner_name: row.learner_name,
      course_id: row.course_id,
      exam_type: row.exam_type,
      passing_grade: row.passing_grade,
      final_grade: row.final_grade,
      passed: row.passed
    });
  }

  toJSON() {
    return {
      id: this.id,
      learner_id: this.learner_id,
      learner_name: this.learner_name,
      course_id: this.course_id,
      exam_type: this.exam_type,
      passing_grade: this.passing_grade,
      final_grade: this.final_grade,
      passed: this.passed
    };
  }
}

