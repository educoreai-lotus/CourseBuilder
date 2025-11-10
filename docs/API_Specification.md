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

### 2. `POST /api/v1/ai/trigger-personalized-course`

- **Audience**: Learner-facing journeys (typically triggered from the marketplace or chatbot).
- **Description**: Generates a personalised course outline for a learner by forwarding the request to the same generation pipeline used by trainer submissions.
- **Headers**:
  - `x-source-service: learner_journey`
  - `x-request-id: <uuid>` (optional trace identifier)
- **Query Parameters**:
  - `sourceService=learner_journey` (optional mirror)
  - `learnerId=<uuid>` (optional – overrides body `learner_id` if both supplied)

#### Success Response

- **Status**: `201 Created`
- **Body**: Unified response schema (the `meta.sourceService` reflects the learner entry point).

#### Sample Request

```json
{
  "sourceService": "learner_journey",
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "learning_path": [
    {
      "topic_name": "Product Analytics for PMs"
    }
  ],
  "skills": ["sql", "product-analytics"],
  "metadata": {
    "interest_tags": ["growth", "experimentation"],
    "preferred_format": "microlearning"
  }
}
```

#### Sample Response

```json
{
  "status": "accepted",
  "course_id": "07bb1605-6ab3-4cea-8f08-d54c2ac94446",
  "structure": {
    "id": "2cbd0678-b6db-4475-8e21-efa505198de9",
    "modules": [
      {
        "moduleId": "58f33d69-567a-41f5-8e5b-d4d04d3d72dd",
        "title": "Understanding Product Metrics",
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

## Next Steps

1. Mirror this schema in the integration gateway so `/api/v1/integrations` forwards `sourceService` downstream without manual mapping.
2. Generate an OpenAPI 3.1 definition from this document (planned).
3. Expand automated contract tests to cover header, query, and body combinations for `sourceService`.



