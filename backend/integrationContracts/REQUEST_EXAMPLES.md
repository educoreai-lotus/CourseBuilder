# Integration Request Examples

This file contains example request bodies for each microservice integration endpoint.

**Endpoint:** `POST /api/fill-content-metrics`

**Important:** 
- The entire request body must be a **stringified JSON**
- Request body contains **only three fields**: `requester_service`, `payload`, `response`
- `requester_service` must always be `"CourseBuilder"` (identifies who is making the request)
- `payload` must be a **stringified JSON string** (data sent to target microservice)
- `response` must be a **stringified JSON string** (template for expected response structure, initially empty, filled by the service)
- Routing to target microservice is determined **internally** from payload structure - no routing fields in request/response

---

## Content Studio

### Learner-Specific Course Request

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder",
  "payload": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "learner_name": "Alex Doe",
    "learner_company": "Acme Corp",
    "skills": ["react-hooks", "javascript", "frontend"]
  },
  "response": {
    "learner_id": "",
    "learner_name": "",
    "learner_company": "",
    "topics": []
  }
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"learner_company\":\"Acme Corp\",\"skills\":[\"react-hooks\",\"javascript\",\"frontend\"]}",
  "response": "{\"learner_id\":\"\",\"learner_name\":\"\",\"learner_company\":\"\",\"topics\":[]}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder",
  "payload": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "learner_name": "Alex Doe",
    "learner_company": "Acme Corp",
    "skills": ["react-hooks", "javascript", "frontend"]
  },
  "response": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "learner_name": "Alex Doe",
    "learner_company": "Acme Corp",
    "topics": [
      {
        "topic_id": "t-1",
        "topic_name": "Mastering React Hooks",
        "topic_description": "Hands-on introduction to useState and useEffect",
        "topic_language": "en-US",
        "trainer_id": "trainer-123",
        "trainer_name": "Senior Frontend Trainer",
        "template_id": "react-hooks-template",
        "format_order": ["video", "github_snippet", "quiz"],
        "contents": [
          {
            "content_id": "c-video-1",
            "content_type": "video",
            "content_data": {
              "title": "React Hooks Crash Course",
              "youtube_id": "abcd1234"
            }
          }
        ],
        "devlab_exercises": ""
      }
    ]
  }
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"learner_company\":\"Acme Corp\",\"skills\":[\"react-hooks\",\"javascript\",\"frontend\"]}",
  "response": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"learner_company\":\"Acme Corp\",\"topics\":[{\"topic_id\":\"t-1\",\"topic_name\":\"Mastering React Hooks\",\"topic_description\":\"...\",\"contents\":[...],\"devlab_exercises\":\"\"}]}"
}
```

---

## Learner AI

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "LearnerAI",
  "payload": {},
  "response": {
    "user_id": "",
    "user_name": "",
    "company_id": "",
    "company_name": "",
    "skills": [],
    "competency_name": ""
  }
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "LearnerAI",
  "payload": "{}",
  "response": "{\"user_id\":\"\",\"user_name\":\"\",\"company_id\":\"\",\"company_name\":\"\",\"skills\":[],\"competency_name\":\"\"}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "LearnerAI",
  "payload": {},
  "response": {
    "user_id": "00000000-0000-0000-0000-000000000001",
    "user_name": "Alex Doe",
    "company_id": "company-123",
    "company_name": "Acme Corp",
    "skills": ["react-hooks", "javascript"],
    "competency_name": "Frontend Development"
  }
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "LearnerAI",
  "payload": "{}",
  "response": "{\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"user_name\":\"Alex Doe\",\"company_id\":\"company-123\",\"company_name\":\"Acme Corp\",\"skills\":[\"react-hooks\",\"javascript\"],\"competency_name\":\"Frontend Development\"}"
}
```

---

## Assessment

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Assessment",
  "payload": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "learner_name": "Alex Doe",
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "coverage_map": [
      {
        "lesson_id": "l-1",
        "skills": ["react-hooks"]
      }
    ]
  },
  "response": {
    "learner_id": "",
    "course_id": "",
    "course_name": "",
    "exam_type": "",
    "passing_grade": 0,
    "final_grade": 0,
    "passed": false
  }
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "Assessment",
  "payload": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"coverage_map\":[{\"lesson_id\":\"l-1\",\"skills\":[\"react-hooks\"]}]}",
  "response": "{\"learner_id\":\"\",\"course_id\":\"\",\"course_name\":\"\",\"exam_type\":\"\",\"passing_grade\":0,\"final_grade\":0,\"passed\":false}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Assessment",
  "payload": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "learner_name": "Alex Doe",
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "coverage_map": [
      {
        "lesson_id": "l-1",
        "skills": ["react-hooks"]
      }
    ]
  },
  "response": {
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "exam_type": "postcourse",
    "passing_grade": 70.0,
    "final_grade": 85.5,
    "passed": true
  }
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "Assessment",
  "payload": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"coverage_map\":[{\"lesson_id\":\"l-1\",\"skills\":[\"react-hooks\"]}]}",
  "response": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"exam_type\":\"postcourse\",\"passing_grade\":70.0,\"final_grade\":85.5,\"passed\":true}"
}
```

---

## Directory

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Directory",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Great course!",
      "submitted_at": "2024-01-15T10:00:00Z"
    },
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "learner_id": "00000000-0000-0000-0000-000000000001"
  },
  "response": {
    "employee_id": "",
    "preferred_language": "",
    "bonus_attempt": false
  }
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "Directory",
  "payload": "{\"feedback\":{\"rating\":5,\"comment\":\"Great course!\",\"submitted_at\":\"2024-01-15T10:00:00Z\"},\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"learner_id\":\"00000000-0000-0000-0000-000000000001\"}",
  "response": "{\"employee_id\":\"\",\"preferred_language\":\"\",\"bonus_attempt\":false}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Directory",
  "payload": {
    "feedback": {
      "rating": 5,
      "comment": "Great course!",
      "submitted_at": "2024-01-15T10:00:00Z"
    },
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "learner_id": "00000000-0000-0000-0000-000000000001"
  },
  "response": {
    "employee_id": "emp-123",
    "preferred_language": "en-US",
    "bonus_attempt": true
  }
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "Directory",
  "payload": "{\"feedback\":{\"rating\":5,\"comment\":\"Great course!\",\"submitted_at\":\"2024-01-15T10:00:00Z\"},\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"learner_id\":\"00000000-0000-0000-0000-000000000001\"}",
  "response": "{\"employee_id\":\"emp-123\",\"preferred_language\":\"en-US\",\"bonus_attempt\":true}"
}
```

---

## Skills Engine

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "SkillsEngine",
  "payload": {
    "topic": "React Hooks"
  },
  "response": {
    "skills": []
  }
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "SkillsEngine",
  "payload": "{\"topic\":\"React Hooks\"}",
  "response": "{\"skills\":[]}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "SkillsEngine",
  "payload": {
    "topic": "React Hooks"
  },
  "response": {
    "skills": ["useState", "useEffect", "useContext", "useReducer", "custom-hooks"]
  }
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "SkillsEngine",
  "payload": "{\"topic\":\"React Hooks\"}",
  "response": "{\"skills\":[\"useState\",\"useEffect\",\"useContext\",\"useReducer\",\"custom-hooks\"]}"
}
```

---

## Learning Analytics

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "LearningAnalytics",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "course_type": "trainer",
    "status": "active",
    "level": "intermediate",
    "duration_hours": 10,
    "structure": {},
    "enrollment": {},
    "feedback": {},
    "assessments": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  },
  "response": {}
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "LearningAnalytics",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"course_type\":\"trainer\",\"status\":\"active\",\"level\":\"intermediate\",\"duration_hours\":10,\"structure\":{},\"enrollment\":{},\"feedback\":{},\"assessments\":{},\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-15T10:00:00Z\"}",
  "response": "{}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "LearningAnalytics",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "course_type": "trainer",
    "status": "active",
    "level": "intermediate",
    "duration_hours": 10,
    "structure": {},
    "enrollment": {},
    "feedback": {},
    "assessments": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  },
  "response": {}
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "LearningAnalytics",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"course_type\":\"trainer\",\"status\":\"active\",\"level\":\"intermediate\",\"duration_hours\":10,\"structure\":{},\"enrollment\":{},\"feedback\":{},\"assessments\":{},\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-15T10:00:00Z\"}",
  "response": "{}"
}
```

---

## Management Reporting

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "ManagementReporting",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "level": "intermediate",
    "duration": 10,
    "totalEnrollments": 150,
    "activeEnrollment": 120,
    "completionRate": 75.5,
    "averageRating": 4.5,
    "createdAt": "2024-01-01T00:00:00Z",
    "feedback": []
  },
  "response": {}
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "ManagementReporting",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"level\":\"intermediate\",\"duration\":10,\"totalEnrollments\":150,\"activeEnrollment\":120,\"completionRate\":75.5,\"averageRating\":4.5,\"createdAt\":\"2024-01-01T00:00:00Z\",\"feedback\":[]}",
  "response": "{}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "ManagementReporting",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "course_name": "React Fundamentals",
    "level": "intermediate",
    "duration": 10,
    "totalEnrollments": 150,
    "activeEnrollment": 120,
    "completionRate": 75.5,
    "averageRating": 4.5,
    "createdAt": "2024-01-01T00:00:00Z",
    "feedback": []
  },
  "response": {}
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "ManagementReporting",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"course_name\":\"React Fundamentals\",\"level\":\"intermediate\",\"duration\":10,\"totalEnrollments\":150,\"activeEnrollment\":120,\"completionRate\":75.5,\"averageRating\":4.5,\"createdAt\":\"2024-01-01T00:00:00Z\",\"feedback\":[]}",
  "response": "{}"
}
```

---

## DevLab

**Request Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Devlab",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "course_name": "React Fundamentals"
  },
  "response": {}
}
```

**Request Body (as stringified JSON - actual HTTP request):**
```json
{
  "requester_service": "CourseBuilder", "Devlab",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"course_name\":\"React Fundamentals\"}",
  "response": "{}"
}
```

**Expected Response Structure (as JSON objects - for understanding):**
```json
{
  "requester_service": "CourseBuilder", "Devlab",
  "payload": {
    "course_id": "11111111-1111-1111-1111-111111111111",
    "learner_id": "00000000-0000-0000-0000-000000000001",
    "course_name": "React Fundamentals"
  },
  "response": {}
}
```

**Expected Response (as stringified JSON - actual HTTP response):**
```json
{
  "requester_service": "CourseBuilder", "Devlab",
  "payload": "{\"course_id\":\"11111111-1111-1111-1111-111111111111\",\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"course_name\":\"React Fundamentals\"}",
  "response": "{}"
}
```

---

## Postman Usage

### Method 1: Raw JSON (Recommended)
1. Set **Body** → **raw** → **JSON**
2. Paste the request body as a JSON object (Postman will auto-stringify)
3. The controller handles both object and string formats

### Method 2: Raw Text (Exact String)
1. Set **Body** → **raw** → **Text**
2. Set **Content-Type** header to `application/json`
3. Paste the fully stringified JSON string

### Example Postman Request:
```
POST https://your-api.com/api/fill-content-metrics
Content-Type: application/json

{
  "requester_service": "CourseBuilder",
  "payload": "{\"learner_id\":\"00000000-0000-0000-0000-000000000001\",\"learner_name\":\"Alex Doe\",\"learner_company\":\"Acme Corp\",\"skills\":[\"react-hooks\",\"javascript\",\"frontend\"]}",
  "response": "{\"learner_id\":\"\",\"learner_name\":\"\",\"learner_company\":\"\",\"topics\":[]}"
}
```

---

## Notes

- Request body contains **only three fields**: `requester_service`, `payload`, `response`
- `requester_service` must always be `"CourseBuilder"`
- Routing to target microservice is determined **internally** from payload structure
- `payload` and `response` must be valid JSON strings (stringified)
- Empty response objects will be populated by the microservice
- The entire response envelope is returned as a stringified JSON (only the three fields)

