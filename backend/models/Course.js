/**
 * Course Model
 * Represents a course in the Course Builder system
 */

export class Course {
  constructor(data) {
    this.id = data.id;
    this.course_name = data.course_name;
    this.course_description = data.course_description;
    this.course_type = data.course_type; // 'learner_specific' | 'trainer'
    this.status = data.status; // 'active' | 'archived' | 'draft'
    this.level = data.level; // 'beginner' | 'intermediate' | 'advanced'
    this.duration_hours = data.duration_hours;
    this.start_date = data.start_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.created_by_user_id = data.created_by_user_id;
    
    // Learning path metadata
    this.learning_path_designation = data.learning_path_designation || {};
    // {
    //   is_designated: boolean,
    //   target_competency: { competency_id, competency_name, target_level, max_test_attempts }
    // }
    
    // Dictionaries
    this.studentsIDDictionary = data.studentsIDDictionary || {};
    this.feedbackDictionary = data.feedbackDictionary || {};
    this.lesson_completion_dictionary = data.lesson_completion_dictionary || {};
  }

  static fromRow(row) {
    return new Course({
      id: row.id,
      course_name: row.course_name,
      course_description: row.course_description,
      course_type: row.course_type,
      status: row.status,
      level: row.level,
      duration_hours: row.duration_hours,
      start_date: row.start_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by_user_id: row.created_by_user_id,
      learning_path_designation: row.learning_path_designation,
      studentsIDDictionary: row.studentsIDDictionary,
      feedbackDictionary: row.feedbackDictionary,
      lesson_completion_dictionary: row.lesson_completion_dictionary
    });
  }

  toJSON() {
    return {
      id: this.id,
      course_name: this.course_name,
      course_description: this.course_description,
      course_type: this.course_type,
      status: this.status,
      level: this.level,
      duration_hours: this.duration_hours,
      start_date: this.start_date?.toISOString(),
      created_at: this.created_at?.toISOString(),
      updated_at: this.updated_at?.toISOString(),
      created_by_user_id: this.created_by_user_id,
      learning_path_designation: this.learning_path_designation,
      studentsIDDictionary: this.studentsIDDictionary,
      feedbackDictionary: this.feedbackDictionary,
      lesson_completion_dictionary: this.lesson_completion_dictionary
    };
  }
}


