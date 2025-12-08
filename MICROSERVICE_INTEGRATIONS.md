# Microservice Integration Payloads & Responses

This document contains **complete request/response examples** for all microservice integrations using the **shared envelope structure**.

## Envelope Structure

All microservice communications use this shared envelope format:

```json
{
  "requester_service": "string",  // Service name making the request
  "payload": {},                   // Service-specific request data (object, NOT stringified)
  "response": {}                   // Service-specific response template (object, NOT stringified)
}
```

---

## 1. Content Studio Integration

### Course Builder → Content Studio (Request Course Content)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"],
    "learning_path": [
      {
        "topic_name": "React Hooks",
        "topic_description": "Introduction to React Hooks",
        "topic_language": "en"
      }
    ],
    "language": "en",
    "trainer_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "trainer_name": "John Trainer"
  },
  "response": {
    "course": []
  }
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"],
    "learning_path": [...]
  },
  "response": {
    "course": [
      {
        "course_id": "22222222-2222-2222-2222-222222222222",
        "course_name": "Advanced React Development",
        "course_description": "Master React Hooks and TypeScript",
        "trainer_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "trainer_name": "John Trainer",
        "topic_id": "33333333-3333-3333-3333-333333333333",
        "topic_name": "React Hooks",
        "topic_description": "Introduction to React Hooks",
        "skills": ["react", "hooks", "typescript"],
        "content_type": "mixed",
        "content_data": {
          "video_url": "https://example.com/video",
          "transcript": "...",
          "summary": "..."
        },
        "devlab_exercises": [
          {
            "exercise_id": "ex-1",
            "title": "Build a Todo App",
            "difficulty": "intermediate"
          }
        ]
      }
    ]
  }
}
```

**Minimal Request (Marketplace Course):**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "skills": ["react", "javascript"]
  },
  "response": {
    "course": []
  }
}
```

---

## 2. Learner AI Integration

### Course Builder → Learner AI (Request Learning Path)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "user_id": "11111111-1111-1111-1111-111111111111",
    "tag": "Full-Stack JavaScript Developer"
  },
  "response": {
    "learning_path": [],
    "skills": []
  }
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "user_id": "11111111-1111-1111-1111-111111111111",
    "tag": "Full-Stack JavaScript Developer"
  },
  "response": {
    "learning_path": [
      {
        "topic_name": "React Fundamentals",
        "topic_description": "Learn React basics",
        "topic_language": "en"
      },
      {
        "topic_name": "Node.js Backend",
        "topic_description": "Build server-side applications",
        "topic_language": "en"
      }
    ],
    "skills": [
      "react",
      "javascript",
      "typescript",
      "node.js",
      "express",
      "postgresql"
    ],
    "level": "intermediate",
    "duration": 40
  }
}
```

**Note:** The `tag` field can be:
- A competency name (e.g., "Full-Stack JavaScript Developer")
- A learning path name
- Any other identifier for personalized learning

---

## 3. Assessment Integration

### Course Builder → Assessment (Request Assessment)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "learner_name": "John Doe",
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "coverage_map": [
      {
        "lesson_id": "33333333-3333-3333-3333-333333333333",
        "skills": ["react", "hooks", "context"]
      },
      {
        "lesson_id": "44444444-4444-4444-4444-444444444444",
        "skills": ["react", "performance", "memoization"]
      }
    ]
  },
  "response": {
    "learner_id": "",
    "course_id": "",
    "course_name": "",
    "exam_type": "postcourse",
    "passing_grade": 70.00,
    "final_grade": null,
    "passed": null
  }
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "learner_name": "John Doe",
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "coverage_map": [...]
  },
  "response": {
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "exam_type": "postcourse",
    "passing_grade": 70.00,
    "final_grade": 92.5,
    "passed": true
  }
}
```

---

## 4. Directory Integration

### Course Builder → Directory (Send Feedback)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Excellent course! Very comprehensive and well-structured.",
      "submitted_at": "2025-11-13T10:00:00Z"
    },
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "employee_id": "11111111-1111-1111-1111-111111111111"
  },
  "response": {}
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Excellent course! Very comprehensive and well-structured.",
      "submitted_at": "2025-11-13T10:00:00Z"
    },
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "employee_id": "11111111-1111-1111-1111-111111111111"
  },
  "response": {}
}
```

**Note:** This is a **one-way communication**. Directory acknowledges but doesn't return data in response to feedback.

### Directory → Course Builder (Receive Employee Data)

**Request Envelope (from Directory):**
```json
{
  "requester_service": "directory",
  "payload": {
    "employee_id": "11111111-1111-1111-1111-111111111111",
    "preferred_language": "en",
    "bonus_attempt": true
  },
  "response": {}
}
```

---

## 5. Learning Analytics Integration

### Course Builder → Learning Analytics (Send Analytics Data)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "course_type": "trainer",
    "status": "active",
    "level": "advanced",
    "duration_hours": 40,
    "structure": {
      "topics_count": 5,
      "topics": [
        {
          "topic_id": "33333333-3333-3333-3333-333333333333",
          "topic_name": "React Hooks",
          "skills": ["react", "hooks", "useState", "useEffect"]
        }
      ]
    },
    "enrollment": {
      "total_enrollments": 150,
      "active_enrollments": 75,
      "completed_enrollments": 50
    },
    "feedback": {
      "total_feedback": 45,
      "average_rating": 4.6,
      "feedbacks": [
        {
          "learner_id": "11111111-1111-1111-1111-111111111111",
          "rating": 5,
          "comment": "Great course!",
          "submitted_at": "2025-11-13T10:00:00Z"
        }
      ]
    },
    "assessments": {
      "total_assessments": 50,
      "passed_count": 42,
      "average_grade": 85.5
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-11-13T10:00:00Z"
  },
  "response": {}
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {...},
  "response": {}
}
```

**Note:** This is a **one-way communication**. Learning Analytics acknowledges but doesn't return data.

---

## 6. Management Reporting Integration

### Course Builder → Management Reporting (Send Course Statistics)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "22222222-2222-2222-2222-222222222222",
    "course_name": "Advanced React Development",
    "level": "advanced",
    "duration": 40,
    "totalEnrollments": 150,
    "activeEnrollment": 75,
    "completionRate": 66.67,
    "averageRating": 4.6,
    "createdAt": "2025-01-01T00:00:00Z",
    "feedback": [
      {
        "learner_id": "11111111-1111-1111-1111-111111111111",
        "rating": 5,
        "comment": "Excellent course!",
        "submitted_at": "2025-11-13T10:00:00Z"
      }
    ]
  },
  "response": {}
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {...},
  "response": {}
}
```

**Note:** This is a **one-way communication**. Management Reporting acknowledges but doesn't return data.

---

## 7. Skills Engine Integration

### Course Builder → Skills Engine (Request Skills Processing)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "topic": "Advanced React Performance Optimization"
  },
  "response": {
    "skills": []
  }
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "topic": "Advanced React Performance Optimization"
  },
  "response": {
    "skills": [
      "react",
      "react-hooks",
      "performance",
      "memoization",
      "code-splitting",
      "lazy-loading",
      "virtual-dom"
    ]
  }
}
```

---

## 8. DevLab Integration

### Course Builder → DevLab (Request Exercises)

**Request Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "22222222-2222-2222-2222-222222222222",
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "Advanced React Development with Hooks and Context API"
  },
  "response": {}
}
```

**Response Envelope:**
```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "22222222-2222-2222-2222-222222222222",
    "learner_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "Advanced React Development with Hooks and Context API"
  },
  "response": {}
}
```

**Note:** DevLab exercises are stored in `lessons.devlab_exercises` field. This is a **one-way communication**.

---

## 9. Directory Trigger (NEW Flow)

### Directory → Course Builder (Trigger Learning Path)

**Request (Direct API Call, NOT via Coordinator):**
```json
POST /api/v1/directory/trigger-learning-path

{
  "learner_id": "11111111-1111-1111-1111-111111111111",
  "learner_name": "Sarah Levy",
  "learner_company": "TechLabs",
  "tag": "Full-Stack JavaScript Developer",
  "language": "en",
  "trainer_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "trainer_name": "John Trainer"
}
```

**Response:**
```json
{
  "status": "created",
  "course_id": "22222222-2222-2222-2222-222222222222",
  "course_name": "Personalized Course",
  "course_type": "learner_specific",
  "learner_id": "11111111-1111-1111-1111-111111111111",
  "trainer_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "created_at": "2025-11-13T10:00:00Z"
}
```

**Flow:**
1. Directory sends request to Course Builder
2. Course Builder calls Learner AI via Coordinator (envelope format)
3. Course Builder calls Content Studio via Coordinator (envelope format)
4. Course Builder creates course and returns result

---

## Important Notes

### Envelope Structure Rules

1. **`requester_service`**: Always lowercase with underscores (e.g., `"course_builder"`, `"content_studio"`)
2. **`payload`**: Regular JSON object, **NOT** a stringified JSON string
3. **`response`**: Regular JSON object, **NOT** a stringified JSON string
4. **Initial Request**: `response` field contains empty/default values as a template
5. **Response**: `response` field is filled by the target service and returned

### Communication Patterns

- **Two-way**: Content Studio, Learner AI, Assessment, Skills Engine
- **One-way (Course Builder sends)**: Directory (feedback), Learning Analytics, Management Reporting, DevLab
- **One-way (Course Builder receives)**: Directory (employee data)

### Field Naming Conventions

- **UUIDs**: All IDs are UUID v4 format strings
- **Timestamps**: ISO8601 format strings (e.g., `"2025-11-13T10:00:00Z"`)
- **Arrays**: Default to empty array `[]` if not provided
- **Optional Fields**: Can be `null` or omitted

### Coordinator Integration

All microservice calls (except Directory trigger) go through the **Coordinator** service using the envelope structure. The Coordinator:
- Validates the envelope structure
- Routes to the correct microservice
- Signs the request
- Returns the response in the same envelope format

---

## Quick Reference

| Microservice | Direction | Envelope Used | Returns Data |
|-------------|-----------|---------------|--------------|
| Content Studio | Course Builder → | ✅ | ✅ |
| Learner AI | Course Builder → | ✅ | ✅ |
| Assessment | Course Builder → | ✅ | ✅ |
| Directory (Feedback) | Course Builder → | ✅ | ❌ (Acknowledge only) |
| Directory (Employee Data) | Directory → Course Builder | ✅ | ❌ (Acknowledge only) |
| Learning Analytics | Course Builder → | ✅ | ❌ (Acknowledge only) |
| Management Reporting | Course Builder → | ✅ | ❌ (Acknowledge only) |
| Skills Engine | Course Builder → | ✅ | ✅ |
| DevLab | Course Builder → | ✅ | ❌ (Stores in DB) |
| Directory Trigger | Directory → Course Builder | ❌ (Direct API) | ✅ |

---

## Related Files

- **Contract Definitions**: `integration_contracts/*.json` - Detailed field definitions
- **Shared Envelope**: `integration_contracts/SHARED_ENVELOPE_STRUCTURE.md` - Envelope documentation
- **DTO Builders**: `backend/dtoBuilders/*.js` - Implementation code
- **Gateway Services**: `backend/services/gateways/*.js` - Coordinator integration


