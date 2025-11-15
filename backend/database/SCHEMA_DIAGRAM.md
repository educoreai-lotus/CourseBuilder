# Database Schema Diagram

## Mermaid ERD

```mermaid
erDiagram
    COURSES ||--o{ TOPICS : "has"
    TOPICS ||--o{ MODULES : "has"
    MODULES ||--o{ LESSONS : "has"
    LESSONS ||--o{ EXERCISES : "has"
    COURSES ||--o{ REGISTRATIONS : "has"
    COURSES ||--o{ ASSESSMENTS : "has"
    COURSES ||--o{ FEEDBACK : "has"
    COURSES ||--o{ VERSIONS : "tracks"
    TOPICS ||--o{ VERSIONS : "tracks"
    MODULES ||--o{ VERSIONS : "tracks"
    LESSONS ||--o{ VERSIONS : "tracks"

    COURSES {
        uuid id PK
        text course_name
        text course_description
        enum course_type "learner_specific|trainer"
        enum status "active|archived|draft"
        enum level "beginner|intermediate|advanced"
        int duration_hours
        timestamp start_date
        timestamp created_at
        timestamp updated_at
        uuid created_by_user_id
        jsonb learning_path_designation
        int max_test_attempts
        jsonb studentsIDDictionary
        jsonb feedbackDictionary
        jsonb lesson_completion_dictionary
    }

    TOPICS {
        uuid id PK
        uuid course_id FK
        text topic_name
        text topic_description
        jsonb skills
    }

    MODULES {
        uuid id PK
        uuid topic_id FK
        text module_name
        text module_description
    }

    LESSONS {
        uuid id PK
        uuid module_id FK
        uuid topic_id FK
        text lesson_name
        text lesson_description
        jsonb skills
        uuid_array trainer_ids
        text content_type
        jsonb content_data
        jsonb devlab_exercises
    }

    EXERCISES {
        uuid id PK
        uuid lesson_id FK
        text exercise_type
        jsonb content
        enum difficulty "beginner|intermediate|advanced"
    }

    ASSESSMENTS {
        uuid id PK
        uuid learner_id
        text learner_name
        uuid course_id FK
        enum exam_type "postcourse"
        numeric passing_grade
        numeric final_grade
        boolean passed
        -- coverage_map removed (built dynamically)
    }

    FEEDBACK {
        uuid id PK
        uuid learner_id
        uuid course_id FK
        int rating "1-5"
        text comment
        timestamp submitted_at
        -- course_name removed (looked up from course_id)
    }

    REGISTRATIONS {
        uuid id PK
        uuid learner_id
        text learner_name
        uuid course_id FK
        uuid company_id
        text company_name
        enum status "completed|in_progress|failed"
        timestamp enrolled_date
        timestamp completed_date
    }

    VERSIONS {
        uuid id PK
        enum entity_type "course|topic|module|lesson"
        uuid entity_id
        int version_number
        jsonb data
        timestamp created_at
    }
```

## Table Relationships

1. **courses** → **topics** (1:N)
   - One course has many topics
   - Foreign key: `topics.course_id` → `courses.id`

2. **topics** → **modules** (1:N)
   - One topic has many modules
   - Foreign key: `modules.topic_id` → `topics.id`

3. **modules** → **lessons** (1:N)
   - One module has many lessons
   - Foreign key: `lessons.module_id` → `modules.id`

4. **lessons** → **exercises** (1:N)
   - One lesson has many exercises
   - Foreign key: `exercises.lesson_id` → `lessons.id`

5. **courses** → **registrations** (1:N)
   - One course has many registrations
   - Foreign key: `registrations.course_id` → `courses.id`

6. **courses** → **assessments** (1:N)
   - One course has many assessments
   - Foreign key: `assessments.course_id` → `courses.id`

7. **courses** → **feedback** (1:N)
   - One course has many feedback entries
   - Foreign key: `feedback.course_id` → `courses.id`

8. **versions** tracks all entities
   - Can track versions of courses, topics, modules, or lessons
   - Composite unique key: `(entity_type, entity_id, version_number)`

## JSONB Fields

### courses.learning_path_designation
```json
{
  "is_designated": boolean,
  "target_competency": {
    "competency_id": "uuid",
    "competency_name": "string",
    "target_level": "string",
    "max_test_attempts": number
  }
}
```

### courses.studentsIDDictionary
```json
{
  "student_id": {
    "status": "in_progress|completed|failed",
    "enrolled_date": "ISO8601",
    "completed_date": "ISO8601",
    "completion_reason": "string"
  }
}
```

### courses.feedbackDictionary
```json
{
  "user_id": {
    "rating": 1-5,
    "comment": "string",
    "submitted_at": "ISO8601"
  }
}
```

### courses.lesson_completion_dictionary
```json
{
  "student_id": {
    "lesson_id": {
      "completed": boolean,
      "completed_at": "ISO8601"
    }
  }
}
```

### assessments.coverage_map
**REMOVED** - Coverage map is built dynamically from lessons when sending to Assessment microservice via `assessmentDTO.buildSendPayload()`.

