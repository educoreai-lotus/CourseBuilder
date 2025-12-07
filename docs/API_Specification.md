# Course Input & Generation API

This document captures the current public contract for the Course Builder input and generation workflow. It defines the shared request model, headers, query parameters, and response structure used by both trainer and learner oriented entry points.

The content below will be used as the source-of-truth when we publish Swagger/OpenAPI documentation.

---

## Shared Conventions

- **Content-Type**: `application/json`
- **Authentication**: _Not enforced in the local environment. Downstream consumers should include their preferred auth headers (e.g., `Authorization`) once gateway policies are finalised._
- **Optional Source Hint**: To help the integration gateway route requests, callers may provide one of the following (they all resolve to the same field internally):

  | Location  | Key                               | Notes                                |
  |-----------|-----------------------------------|--------------------------------------|
  | Header    | `x-source-service`                | Preferred                             |
  | Header    | `x-service-name`                  | Legacy alias                         |
  | Query     | `sourceService`, `service`        | Optional when headers are unavailable |
  | Body      | `sourceService`, `service`        | Included in validation allow-list    |

- **Query Parameters** (optional for both endpoints):

  | Name            | Type    | Description                                                     |
  |-----------------|---------|-----------------------------------------------------------------|
  | `sourceService` | string  | Mirrors the header value when clients can only send query args. |
  | `learnerId`     | string  | External learner identifier to assist downstream analytics.     |

---

## Unified Request Schema

```json
{
  "sourceService": "string (optional)",
  "learner_id": "string (optional, UUID or external identifier)",
  "learner_name": "string (optional)",
  "learner_company": "string (optional)",
  "learning_path": [
    {
      "topic_id": "string (optional)",
      "topic_name": "string (required)",
      "topic_language": "string (optional, defaults to English)",
      "topic_description": "string (optional)"
    }
  ],
  "skills": ["string", "..."],
  "level": "beginner | intermediate | advanced (optional)",
  "duration": "integer minutes (optional)",
  "metadata": "object (optional, free-form enrichment)",
  "...": "additional keys are preserved for backward compatibility"
}
```

> **Validation behaviour**  
> The schema accepts `sourceService` as an optional property and allows additional keys so legacy clients remain compatible. Unknown keys are passed through untouched.

---

## Unified Response Schema

All course generation endpoints return the same envelope:

```json
{
  "status": "accepted",
  "course_id": "uuid",
  "structure": {
    "id": "uuid",
    "modules": [
      {
        "moduleId": "uuid",
        "title": "string",
        "lessons": [
          {
            "lessonId": "uuid",
            "title": "string",
            "duration": "integer minutes"
          }
        ]
      }
    ]
  },
  "meta": {
    "sourceService": "string | null",
    "receivedAt": "ISO timestamp",
    "processingNotes": ["string", "..."]
  }
}
```

> The `meta` block is optional in current responses. It will become the standard place to expose diagnostic or routing information when the integration gateway is fully centralised.

---

## Endpoint Reference

### 1. `POST /api/v1/courses/input`

- **Audience**: Trainer-facing content studio integrations.
- **Description**: Accepts curated course outlines from partner authoring tools and normalises them for the generation service.
- **Headers**:
  - `x-source-service: content_studio` (recommended)
  - `Authorization: Bearer <token>` (optional, dependent on gateway policy)
- **Query Parameters** (optional):
  - `learnerId=<uuid>` – supplies a learner context for analytics, if known.

#### Success Response

- **Status**: `201 Created`
- **Body**: Unified response schema.

#### Sample Request

```json
{
  "sourceService": "content_studio",
  "learner_id": "5f5c1d4e-2cda-4c4c-9c5c-98d51ee5205e",
  "learner_name": "Jordan Rivera",
  "learning_path": [
    {
      "topic_name": "AI Prompt Engineering",
      "topic_description": "Short-form prompts for marketing teams"
    },
    {
      "topic_id": "lp-vision-101",
      "topic_name": "Vision Transformers",
      "topic_language": "English"
    }
  ],
  "skills": ["prompting", "nlp", "computer-vision"],
  "level": "intermediate",
  "duration": 90,
  "metadata": {
    "campaign": "Emerald-Launch",
    "regions": ["emea", "apac"]
  }
}
```

#### Sample Response

```json
{
  "status": "accepted",
  "course_id": "3b0d1115-93ad-4d78-9382-46d0a4e3a5b1",
  "structure": {
    "id": "f9a3f8d5-7f4f-4d7a-8bea-1cddf6877c62",
    "modules": [
      {
        "moduleId": "0c44756d-ace8-4928-9b39-1f4c2af92422",
        "title": "Foundations of Prompt Engineering",
        "lessons": [
          {
            "lessonId": "8c0d9af4-0775-4fe3-8dee-d7c055c7a978",
            "title": "Prompt Structures that Convert",
            "duration": 25
          }
        ]
      }
    ]
  },
  "meta": {
    "sourceService": "content_studio",
    "receivedAt": "2025-11-10T10:25:13.512Z",
    "processingNotes": []
  }
}
```

---

### 2. `POST /api/v1/directory/trigger-learning-path`

- **Audience**: Directory microservice (triggers personalized course generation)
- **Description**: Generates a personalized course for a learner following the flow: Directory → Course Builder → Learner AI → Content Studio → Course Builder
- **Flow**: 
  1. Directory sends learner_id and tag to Course Builder
  2. Course Builder calls Learner AI via Coordinator with { learner_id, tag }
  3. Learner AI returns learning_path and skills
  4. Course Builder calls Content Studio via Coordinator with learner details, learning_path, language, and optional trainer details
  5. Content Studio generates course content
  6. Course Builder creates and stores the course
- **Headers**:
  - `Authorization: Bearer <token>` (required for service/admin roles)
  - `x-source-service: directory` (recommended)
- **Authorization**: Requires `service` or `admin` role

#### Success Response

- **Status**: `201 Created`
- **Body**: Course creation response with course_id and metadata

#### Sample Request (Without Trainer)

```json
{
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "learner_name": "John Doe",
  "learner_company": "Acme Corp",
  "tag": "competency:react-development",
  "language": "en"
}
```

#### Sample Request (With Trainer)

```json
{
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "learner_name": "John Doe",
  "learner_company": "Acme Corp",
  "tag": "learning-path:full-stack-bootcamp",
  "language": "en",
  "trainer_id": "b9fd1e47-2558-5f0b-a9c2-d0cge3df7d7b",
  "trainer_name": "Jane Trainer"
}
```

#### Sample Response

```json
{
  "status": "created",
  "course_id": "07bb1605-6ab3-4cea-8f08-d54c2ac94446",
  "course_name": "Personalized React Development Path",
  "course_type": "learner_specific",
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "trainer_id": "b9fd1e47-2558-5f0b-a9c2-d0cge3df7d7b",
  "created_at": "2025-12-07T14:30:00.000Z"
}
```

#### Notes

- **Removed**: The old endpoint `POST /api/v1/ai/trigger-personalized-course` has been removed
- **New Flow**: Personalized courses are now ONLY triggered by Directory service
- **Marketplace Courses**: Trainer-driven courses still use `POST /api/v1/courses/input` (Content Studio → Course Builder)
        "lessons": [
          {
            "lessonId": "3d81c1de-a5f6-4a68-b737-4df0b9057ed5",
            "title": "North Star Metrics Workshop",
            "duration": 20
          }
        ]
      }
    ]
  },
  "meta": {
    "sourceService": "learner_journey",
    "receivedAt": "2025-11-10T10:26:44.912Z",
    "processingNotes": ["Personalised journey generated for learner a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a"]
  }
}
```

---

## Error Handling

Both endpoints share the same error model:

```json
{
  "message": "Invalid input payload: \"learning_path\" is required",
  "error": true
}
```

- **Status Codes**:
  - `400 Bad Request` – validation errors (missing fields, invalid enum values, empty arrays, etc.).
  - `500 Internal Server Error` – unexpected failures in generation or database layers.

When validation fails because of legacy fields, the response body now preserves the offending field names, enabling clients to adjust gradually.

---

## Course Enrollment & Progress

Learner-facing screens interact with the following endpoints to manage course enrollment and lesson completion. These routes share the same authentication semantics as the rest of the API (JWT-based once gateway policies are enforced).

### `POST /api/v1/courses/:courseId/register`

- **Audience**: Learner dashboard and marketplace flows.
- **Description**: Creates (or confirms) a learner registration for the specified course and returns the registration identifier used for downstream progress updates.

#### Request Body

```json
{
  "learner_id": "00000000-0000-0000-0000-000000000101",
  "learner_name": "optional",
  "learner_company": "optional"
}
```

#### Success Response `201 Created`

```json
{
  "status": "registered",
  "registration_id": "5fce7207-8a8d-4fdb-a735-3900df6f0be8",
  "course_id": "11111111-1111-1111-1111-111111111111",
  "learner_id": "00000000-0000-0000-0000-000000000101",
  "progress": 0
}
```

> Subsequent attempts to register the same learner return `409 Conflict`.

### `PATCH /api/v1/courses/:courseId/progress`

- **Audience**: Lesson view (mark-as-complete action) and progress indicators.
- **Description**: Upserts lesson completion state for the learner’s registration and recalculates overall course progress.

#### Request Body

```json
{
  "learner_id": "00000000-0000-0000-0000-000000000101",
  "lesson_id": "4d6533d1-4c2f-4c43-8d8e-7b34c069cf31",
  "completed": true
}
```

#### Success Response `200 OK`

```json
{
  "course_id": "11111111-1111-1111-1111-111111111111",
  "registration_id": "5fce7207-8a8d-4fdb-a735-3900df6f0be8",
  "learner_id": "00000000-0000-0000-0000-000000000101",
  "lesson_id": "4d6533d1-4c2f-4c43-8d8e-7b34c069cf31",
  "completed": true,
  "progress": 100,
  "status": "completed",
  "total_lessons": 1,
  "completed_lessons": [
    "4d6533d1-4c2f-4c43-8d8e-7b34c069cf31"
  ]
}
```

#### Error Responses

- `404 Not Found` – when the course, lesson, or learner registration cannot be located.
- `400 Bad Request` – when required fields (learner_id, lesson_id) are missing.

---

## Next Steps

1. Mirror this schema in the integration gateway so `/api/v1/integrations` forwards `sourceService` downstream without manual mapping.
2. Generate an OpenAPI 3.1 definition from this document (planned).
3. Expand automated contract tests to cover header, query, and body combinations for `sourceService`.



