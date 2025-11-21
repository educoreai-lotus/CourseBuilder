# Shared Envelope Structure

This document defines the **shared request/response envelope structure** used by ALL microservice integrations via `POST /api/fill-content-metrics`.

## Envelope Structure (Shared Across All Services)

Every request and response uses this **common envelope structure**:

```json
{
  "requester_service": "string",  // Service name making the request
  "payload": {},                   // Service-specific request data (object)
  "response": {}                   // Service-specific response template (object)
}
```

## Envelope Fields

### 1. `requester_service` (string)
- **Purpose**: Identifies which microservice is making the request
- **Format**: Lowercase with underscores (e.g., `"course_builder"`, `"content_studio"`, `"learner_ai"`)
- **Required**: Yes
- **Examples**:
  - `"course_builder"` - When Course Builder is making the request
  - `"content_studio"` - When Content Studio is making the request
  - `"learner_ai"` - When Learner AI is making the request

### 2. `payload` (object)
- **Purpose**: Contains the service-specific request data
- **Format**: Regular JSON object (NOT stringified)
- **Required**: Yes
- **Content**: Varies by service (see individual contract files in this directory)

### 3. `response` (object)
- **Purpose**: Template for the expected response structure
- **Format**: Regular JSON object (NOT stringified)
- **Required**: Yes
- **Content**: Varies by service (see individual contract files in this directory)
- **Note**: Initially sent as empty/default values, filled by the handler and returned

## Examples by Microservice

### Example 1: Course Builder → Content Studio

#### Request (Course Builder sending learner course request)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "lnr_76291",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"]
  },
  "response": {
    "course": []
  }
}
```

#### Response (Content Studio returns course data)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "lnr_76291",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"]
  },
  "response": {
    "course": [
      {
        "course_id": "...",
        "course_name": "...",
        // ... full course content
      }
    ]
  }
}
```

---

### Example 2: Learner AI → Course Builder

#### Request (Learner AI sending learning path data)

```json
{
  "requester_service": "learner_ai",
  "payload": {
    "user_id": "10000000-0000-0000-0000-000000000001",
    "user_name": "Sarah Levy",
    "company_id": "22222222-2222-2222-2222-222222222222",
    "company_name": "TechLabs",
    "skills": ["react", "hooks", "typescript", "node.js"],
    "competency_name": "Full-Stack JavaScript Developer"
  },
  "response": {}
}
```

#### Response (Course Builder acknowledges, no data needed)

```json
{
  "requester_service": "learner_ai",
  "payload": {
    "user_id": "10000000-0000-0000-0000-000000000001",
    "user_name": "Sarah Levy",
    "company_id": "22222222-2222-2222-2222-222222222222",
    "company_name": "TechLabs",
    "skills": ["react", "hooks", "typescript", "node.js"],
    "competency_name": "Full-Stack JavaScript Developer"
  },
  "response": {}
}
```

---

### Example 3: Course Builder → Assessment

#### Request (Course Builder sending learner assessment data)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "learner_name": "Sarah Levy",
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "coverage_map": [
      {
        "lesson_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "skills": ["react", "hooks", "useState", "useEffect"]
      },
      {
        "lesson_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "skills": ["react", "context", "reducer"]
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

#### Response (Assessment results)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "learner_name": "Sarah Levy",
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "coverage_map": [...]
  },
  "response": {
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "exam_type": "postcourse",
    "passing_grade": 70.00,
    "final_grade": 92.5,
    "passed": true
  }
}
```

---

### Example 4: Course Builder → Directory

#### Request (Course Builder sending feedback data - one-way)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Excellent course! Very comprehensive and well-structured.",
      "submitted_at": "2025-11-13T10:00:00Z"
    },
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "employee_id": "10000000-0000-0000-0000-000000000001"
  },
  "response": {}
}
```

**Note**: The `employee_id` field contains the learner ID value, but it's sent with the field name `employee_id` (not `learner_id`).

#### Response (Directory acknowledges - no data returned)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Excellent course! Very comprehensive and well-structured.",
      "submitted_at": "2025-11-13T10:00:00Z"
    },
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "employee_id": "10000000-0000-0000-0000-000000000001"
  },
  "response": {}
}
```

**Note**: When Course Builder sends feedback to Directory, it's a **one-way communication**. Directory does not return data in response to feedback.

The Directory fields (`employee_id`, `preferred_language`, `bonus_attempt`) are **separate data** that Directory may provide in other contexts, but they are **NOT part of the feedback response flow**.

---

### Example 5: Course Builder → Skills Engine

#### Request (Course Builder sending topic name)

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

#### Response (Skills Engine processed skills)

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

### Example 6: Course Builder → Learning Analytics

#### Request (Course Builder sending analytics data - one-way)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    "course_type": "trainer",
    "status": "active",
    "level": "advanced",
    "duration_hours": 40,
    "structure": {
      "topics_count": 5,
      "topics": [
        {
          "topic_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
      "feedbacks": [...]
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

#### Response (Learning Analytics acknowledges - no data returned)

```json
{
  "requester_service": "course_builder",
  "payload": {...},
  "response": {}
}
```

---

### Example 7: Course Builder → Management Reporting

#### Request (Course Builder sending course statistics - one-way)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
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
        "learner_id": "10000000-0000-0000-0000-000000000001",
        "rating": 5,
        "comment": "Excellent course!",
        "submitted_at": "2025-11-13T10:00:00Z"
      }
    ]
  },
  "response": {}
}
```

#### Response (Management Reporting acknowledges - no data returned)

```json
{
  "requester_service": "course_builder",
  "payload": {...},
  "response": {}
}
```

---

### Example 8: Course Builder → DevLab

#### Request (Course Builder sending course/learner data - one-way)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "course_name": "Advanced React Development with Hooks and Context API"
  },
  "response": {}
}
```

#### Response (DevLab acknowledges - exercises stored in lessons.devlab_exercises)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "course_name": "Advanced React Development with Hooks and Context API"
  },
  "response": {}
}
```

## Service-Specific Request/Response Data

The **payload** and **response** fields contain service-specific data structures.

These are documented in individual contract files:

- **Content Studio**: `integration_contracts/contentStudio.json`
  - `send`: Fields Course Builder sends TO Content Studio
  - `receive`: Fields Course Builder receives FROM Content Studio

- **Learner AI**: `integration_contracts/learnerAI.json`
  - `send`: Fields Course Builder sends TO Learner AI
  - `receive`: Fields Course Builder receives FROM Learner AI

- **Other Services**: See `integration_contracts/README.md` for full list

## Important Notes

1. **Envelope is Shared**: All services use the same envelope structure (requester_service, payload, response)

2. **Payload/Response are Objects**: 
   - `payload` is a **regular JSON object**, NOT a stringified JSON string
   - `response` is a **regular JSON object**, NOT a stringified JSON string

3. **Service-Specific Content**: 
   - The structure inside `payload` and `response` varies by service
   - Refer to individual contract files for service-specific field definitions

4. **Routing**: 
   - The `requester_service` field identifies the requester
   - Internal routing determines which handler processes the request based on payload structure

## See Also

- `integration_contracts/README.md` - Overview of all contract files
- `integration_contracts/contentStudio.json` - Content Studio contract
- `integration_contracts/learnerAI.json` - Learner AI contract
- Other service contract files in `integration_contracts/` directory

