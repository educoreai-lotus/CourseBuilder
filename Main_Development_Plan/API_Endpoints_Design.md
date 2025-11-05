[Stage: API Endpoints Design]
[Feeds: TDD Specification]
[Created: 2025-11-04]

# API Endpoints Design — Course Builder

## Overview
TBD — purpose, audiences (learner, trainer, services), and auth model (OAuth2 + RBAC).

## Conventions
- Base URL: /api/v1
- Auth: Bearer JWT (RS256); roles: learner, trainer, admin, service
- Content-Type: application/json (REST), gRPC for Content Studio/Assessment/RAG
- Idempotency: POST with Idempotency-Key for publish/credential flows
- Error Model: { code, message, details?, traceId }

## Public Endpoints (Learner)

These routes power the learner-facing UI (home, browse, register, feedback). All endpoints return JSON and require short-lived JWT access tokens except for public browse and feedback views.

### 1) Browse Courses
**GET** `/api/v1/courses`

Retrieves published or trending courses with filters.

**Query Parameters:**
- `search` (string) — Text search in title/description
- `category` (string) — Filter by course category
- `level` (string) — Filter by difficulty
- `sort` (string) — "rating", "newest", "popular"
- `page` / `limit` (number) — Pagination (default 1 / 10)

**Response:**
```json
{
  "page": 1,
  "total": 125,
  "courses": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "level": "beginner|intermediate|advanced",
      "rating": 4.7,
      "tags": ["AI","Python"],
      "duration": "string",
      "thumbnail_url": "string",
      "created_at": "ISO8601"
    }
  ]
}
```

**Scopes/Roles:** Scope `course:read`; Role `public` or `learner`

### 2) Get Course Details
**GET** `/api/v1/courses/:id`

Fetches full structure, metadata, and lessons.

**Response:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "level": "string",
  "modules": [
    {
      "id": "uuid",
      "title": "string",
      "order": 1,
      "lessons": [
        {
          "id": "uuid",
          "title": "string",
          "order": 1,
          "content_ref": "string"
        }
      ]
    }
  ],
  "skills": ["string"],
  "rating": 4.8,
  "version": "string"
}
```

**Scopes/Roles:** Scope `course:read`; Role `learner`

### 3) Register for a Course
**POST** `/api/v1/courses/:id/register`

Enrolls an authenticated learner.

**Request:**
```json
{
  "learner_id": "uuid",
  "company_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "status": "registered",
  "course_id": "uuid",
  "learner_id": "uuid",
  "registered_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `learner:enroll`; Role `learner`

### 4) Submit Feedback
**POST** `/api/v1/courses/:id/feedback`

Learner submits rating after completion.

**Request:**
```json
{
  "learner_id": "uuid",
  "rating": 1-5,
  "tags": ["Clarity","Usefulness","Difficulty"],
  "comment": "string"
}
```

**Response:**
```json
{
  "message": "Feedback submitted successfully",
  "feedback_id": "uuid",
  "timestamp": "ISO8601"
}
```

**Scopes/Roles:** Scope `feedback:write`; Role `learner`

### 5) Get Feedback (Aggregated)
**GET** `/api/v1/feedback/:courseId`

Returns public ratings and tag breakdown.

**Response:**
```json
{
  "course_id": "uuid",
  "average_rating": 4.6,
  "total_ratings": 154,
  "tags_breakdown": {
    "Clarity": 4.7,
    "Usefulness": 4.8,
    "Difficulty": 3.9
  },
  "recent_comments": [
    {
      "learner_name": "string (anonymized)",
      "rating": 5,
      "comment": "Very clear lessons!",
      "timestamp": "ISO8601"
    }
  ]
}
```

**Scopes/Roles:** Scope `feedback:read`; Role `public` or `learner`

### 6) Search / Filter Helper
**GET** `/api/v1/courses/filters`

Returns distinct filter values (levels, tags, categories).

**Response:**
```json
{
  "levels": ["Beginner","Intermediate","Advanced"],
  "categories": ["AI","Security","Design"],
  "tags": ["Python","UX","Data"]
}
```

**Scopes/Roles:** Scope `course:read`; Role `public`

### Summary Table

| Route | Method | Purpose | Auth | Role | Scope |
|-------|--------|---------|------|------|-------|
| `/courses` | GET | Browse courses | Optional | public/learner | course:read |
| `/courses/:id` | GET | Get details | Required | learner | course:read |
| `/courses/:id/register` | POST | Enroll | Required | learner | learner:enroll |
| `/courses/:id/feedback` | POST | Submit feedback | Required | learner | feedback:write |
| `/feedback/:courseId` | GET | View aggregated feedback | Optional | public/learner | feedback:read |
| `/courses/filters` | GET | Fetch available filters | Optional | public | course:read |

## Trainer/Admin Endpoints

These endpoints are restricted to authenticated users with trainer or admin roles. They manage course creation, editing, versioning, publishing, and analytics feedback.

### 1) Create Course
**POST** `/api/v1/courses`

Purpose: Trainer or admin creates a new course draft (metadata + structure).

**Request:**
```json
{
  "course_name": "string",
  "course_description": "string",
  "level": "beginner|intermediate|advanced",
  "trainer_id": "uuid",
  "trainer_name": "string",
  "skills": ["string"],
  "topics": [
    {
      "topic_name": "string",
      "topic_description": "string",
      "language": "string",
      "modules": [
        {
          "module_title": "string",
          "lessons": ["string"]
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "course_id": "uuid",
  "status": "draft",
  "created_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `course:write`; Role `trainer` / `admin`

### 2) Update Course Metadata
**PUT** `/api/v1/courses/:id`

Purpose: Edit existing course metadata, topics, or skill tags.

**Request:**
```json
{
  "course_name": "string",
  "course_description": "string",
  "level": "string",
  "skills": ["string"],
  "tags": ["string"]
}
```

**Response:**
```json
{
  "course_id": "uuid",
  "status": "updated",
  "version_no": "integer",
  "updated_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `course:write`; Role `trainer` / `admin`

### 3) Publish Course (Immediate)
**POST** `/api/v1/courses/:id/publish`

Purpose: Publishes a validated course instantly to the Marketplace.

**Response:**
```json
{
  "course_id": "uuid",
  "status": "live",
  "published_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `publish:manage`; Role `trainer` / `admin`

### 4) Schedule Publishing
**POST** `/api/v1/courses/:id/schedule`

Purpose: Schedule future publishing for a trainer course.

**Request:**
```json
{
  "publish_at": "ISO8601 (UTC)"
}
```

**Response:**
```json
{
  "course_id": "uuid",
  "status": "scheduled",
  "scheduled_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `publish:manage`; Role `trainer` / `admin`

### 5) Unpublish / Archive Course
**POST** `/api/v1/courses/:id/unpublish`

Purpose: Temporarily remove a course from the Marketplace (retains analytics).

**Response:**
```json
{
  "course_id": "uuid",
  "status": "archived",
  "unpublished_at": "ISO8601"
}
```

**Scopes/Roles:** Scope `publish:manage`; Role `admin`

### 6) View Feedback Analytics
**GET** `/api/v1/courses/:id/feedback/analytics`

Purpose: View summarized learner feedback and performance per version.

**Query Parameters:**
- `from` (date) — Start date (optional)
- `to` (date) — End date (optional)
- `version` (string) — Specific course version (optional)

**Response:**
```json
{
  "course_id": "uuid",
  "average_rating": 4.6,
  "total_feedback": 128,
  "rating_trend": [
    {"date": "2025-10-01", "avg_rating": 4.4},
    {"date": "2025-11-01", "avg_rating": 4.7}
  ],
  "tags_breakdown": {
    "Clarity": 4.8,
    "Usefulness": 4.7,
    "Difficulty": 3.9
  },
  "versions": [
    {"version_no": 1, "avg_rating": 4.5},
    {"version_no": 2, "avg_rating": 4.7}
  ]
}
```

**Scopes/Roles:** Scope `feedback:read`; Role `trainer` / `admin`

### 7) Version History
**GET** `/api/v1/courses/:id/versions`

Purpose: Return course version timeline with metadata and status.

**Response:**
```json
{
  "course_id": "uuid",
  "versions": [
    {
      "version_no": 1,
      "status": "draft|live|archived",
      "created_at": "ISO8601",
      "published_at": "ISO8601"
    }
  ]
}
```

**Scopes/Roles:** Scope `course:read`; Role `trainer` / `admin`

### Summary Table

| Route | Method | Purpose | Role | Scope |
|-------|--------|---------|------|-------|
| `/courses` | POST | Create draft course | trainer/admin | course:write |
| `/courses/:id` | PUT | Update course metadata | trainer/admin | course:write |
| `/courses/:id/publish` | POST | Publish course immediately | trainer/admin | publish:manage |
| `/courses/:id/schedule` | POST | Schedule publishing | trainer/admin | publish:manage |
| `/courses/:id/unpublish` | POST | Unpublish/archive course | admin | publish:manage |
| `/courses/:id/feedback/analytics` | GET | View feedback analytics | trainer/admin | feedback:read |
| `/courses/:id/versions` | GET | View version history | trainer/admin | course:read |

## Internal Service Endpoints

### Content Studio Integration (gRPC)

**Service:** ContentStudioService  
**Protocol:** gRPC (secured via OAuth2 client credentials)

#### 1) Request — Course Builder → Content Studio (Personalized Course Request)
Triggered when a course is personalized for an individual learner via Learner AI.

```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "learner_company": "string",
  "learning_path": [
    {
      "topic_id": "uuid",
      "topic_name": "string",
      "topic_language": "string",
      "topic_description": "string"
    }
  ]
}
```

#### 2) Response — Content Studio → Course Builder (Personalized Course Response)
Returned when Content Studio generates personalized lessons and exercises.

```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "learner_company": "string",
  "topic_id": "uuid",
  "topic_name": "string",
  "topic_language": "string",
  "topic_description": "string",
  "trainer_id": "uuid",
  "trainer_name": "string",
  "skills": ["string"],
  "content_type": ["lesson", "quiz", "video", "mindmap"],
  "content_data": ["string"],
  "devlab_exercises": [
    {
      "exercise_id": "uuid",
      "title": "string",
      "difficulty": "string",
      "instructions": "string"
    }
  ]
}
```

#### 3) Request — Content Studio → Course Builder (Trainer Course Creation)
Used when a trainer builds a structured course manually.

```json
{
  "course_id": "uuid",
  "course_name": "string",
  "course_description": "string",
  "trainer_id": "uuid",
  "trainer_name": "string",
  "topic_id": "uuid",
  "topic_name": "string",
  "topic_language": "string",
  "topic_description": "string",
  "skills": ["string"],
  "content_type": ["lesson", "quiz", "video", "mindmap"],
  "content_data": ["string"],
  "devlab_exercises": [
    {
      "exercise_id": "uuid",
      "title": "string",
      "difficulty": "string",
      "instructions": "string"
    }
  ]
}
```

### Learner AI Integration (REST)

**Purpose:** Learner AI triggers personalized course generation by sending learner context and learning path.

**Endpoint:** `POST /api/v1/ai/trigger-personalized-course`

**Request:**
```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "learner_company": "string",
  "learning_path": [
    {
      "topic_id": "uuid",
      "topic_name": "string",
      "topic_language": "string",
      "topic_description": "string"
    }
  ]
}
```

**Response:**
```json
{
  "status": "accepted",
  "workflow_id": "uuid",
  "message": "Personalized course generation started"
}
```

**Auth/Scopes:** Scope `ai:trigger`; Role `system` (Learner AI → Course Builder); Auth via OAuth2 Client Credentials (short-lived JWT ≈ 10 min)

### Assessment Integration (gRPC)

**Service:** AssessmentService  
**Protocol:** gRPC (secured via OAuth2 client-credentials + mTLS)

#### A) Redirect to Assessment
**RPC:** `AssessmentService.StartAssessment`

**Purpose:** When learner clicks Take Test, Course Builder requests Assessment microservice to start an exam.

**Request:**
```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "course_id": "uuid",
  "coverage_map": {
    "topics": ["uuid"],
    "modules": ["uuid"]
  }
}
```

**Response:**
```json
{
  "assessment_session_id": "uuid",
  "redirect_url": "string",
  "expires_in": 900
}
```

#### B) Report Callback
**RPC:** `AssessmentService.SendReport`

**Purpose:** Assessment sends completion report back to Course Builder.

**Request:**
```json
{
  "assessment_session_id": "uuid",
  "learner_id": "uuid",
  "course_id": "uuid",
  "score": 0-100,
  "result": "pass|fail",
  "completed_at": "ISO8601",
  "coverage_summary": ["string"]
}
```

**Response:**
```json
{
  "status": "received",
  "record_id": "uuid"
}
```

**Auth/Scopes:** Scope `assessment:exchange`; Role `system`; Auth via OAuth2 client-credentials + mTLS (15 min TTL)

### Learning Analytics Integration (REST)

**Purpose:** Send aggregated learner engagement and completion metrics.

**Endpoint:** `POST /api/v1/analytics/learning-data`

**Request:**
```json
{
  "courses": [
    {
      "course_id": "uuid",
      "course_name": "string",
      "level": "string (optional)",
      "duration": "string (optional)",
      "totalEnrollments": "number",
      "activeEnrollment": "number",
      "completionRate": "number (0–100)",
      "averageRating": "number (0–5)",
      "createdAt": "ISO8601",
      "feedbackDictionary": {
        "user_id_1": {
          "rating": 5,
          "tags": ["Clarity","Usefulness"],
          "comment": "Engaging and clear lessons"
        }
      },
      "trainerIDList": ["uuid_1", "uuid_2"],
      "lesson_completion_dictionary": {
        "lesson_id_1": "learned",
        "lesson_id_2": "notlearned"
      },
      "studentsIDDictionary": {
        "user_id_1": "completed",
        "user_id_2": "in_progress",
        "user_id_3": "failed"
      },
      "learning_path": {
        "target_competency": ["string"],
        "current_competency": ["string"],
        "skills": ["string"]
      }
    }
  ]
}
```

**Response:**
```json
{"status":"success","records":128}
```

**Auth/Scopes:** Scope `analytics:share`; Role `system`

### HR Integration (REST)

**Purpose:** Share organizational participation metrics.

**Endpoint:** `POST /api/v1/hr/course-report`

**Request:**
```json
{
  "courses": [
    {
      "course_id": "uuid",
      "course_name": "string",
      "level": "string (optional)",
      "duration": "string (optional)",
      "totalEnrollments": "number",
      "activeEnrollment": "number",
      "completionRate": "number (0–100)",
      "averageRating": "number (0–5)",
      "createdAt": "ISO8601",
      "feedbackDictionary": {
        "user_id_1": {
          "rating": 5,
          "tags": ["Clarity","Usefulness"],
          "comment": "Engaging and clear lessons"
        }
      }
    }
  ]
}
```

**Response:**
```json
{"status":"success"}
```

**Auth/Scopes:** Scope `hr:share`; Role `system`

### Directory Integration (REST)

**Purpose:** Send learner feedback summaries for visibility and reputation.

**Endpoint:** `POST /api/v1/directory/feedback-sync`

**Request:**
```json
{
  "course_id": "uuid",
  "course_name": "string",
  "average_rating": 4.7,
  "feedback_count": 122,
  "tags": ["Clarity","Usefulness"]
}
```

**Response:**
```json
{"status":"synced"}
```

**Auth/Scopes:** Scope `directory:share`; Role `system`

### Credly Integration (REST)

**Purpose:** Issue micro-credentials / digital badges when a learner completes a course.

**Endpoint:** `POST /api/v1/credly/issue`

**Request:**
```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "course_id": "uuid",
  "course_name": "string",
  "skills": ["string"],
  "score": 92,
  "completed_at": "ISO8601"
}
```

**Response:**
```json
{
  "status": "issued",
  "badge_id": "uuid",
  "credly_url": "string"
}
```

**Auth/Scopes:** Scope `credential:issue`; Role `system`; Auth via OAuth2 client-credentials (30 min TTL)

### RAG Integration (gRPC)

**Purpose:** Share course metadata with the RAG Contextual Knowledge Graph for semantic enrichment.

**RPC:** `RAGService.PushCourseMetadata`

**Request:**
```json
{
  "course_id": "uuid",
  "course_name": "string",
  "topics": [
    {
      "topic_id": "uuid",
      "topic_name": "string",
      "skills": ["string"]
    }
  ],
  "trainer_id": "uuid",
  "average_rating": 4.6,
  "tags": ["AI","Security"],
  "metadata_summary": "string"
}
```

**Response:**
```json
{"status":"indexed","graph_node_id":"uuid"}
```

**Auth/Scopes:** Scope `rag:sync`; Role `system`; Auth via signed gRPC token (10 min TTL)

## Schemas
- TBD (Course, Version, Module, Lesson, Registration, Feedback, AssessmentSummary)

## Errors & Status Codes
- TBD (400, 401, 403, 404, 409, 422, 429, 500)

## Security
- Scopes per route group; rate limits; request signing where applicable

## Examples
- TBD — sample requests/responses

## Refinements
- Feature: TBD — TBD
