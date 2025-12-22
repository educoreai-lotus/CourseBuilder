# Assessment Integration Summary

## Overview

Course Builder integrates with the Assessment microservice using a **3-request flow** pattern via the Coordinator service. All communication is authenticated using ECDSA P-256 digital signatures.

## Architecture

```
Frontend → Course Builder API → Assessment Gateway → Coordinator → Assessment Service
                                                                    ↓
Course Builder ← Integration Handler ← Coordinator ← Assessment Service
```

## 3-Request Flow

### 1. LAUNCH REQUEST (Course Builder → Assessment)
**Purpose:** Initialize an assessment session for a learner

**Trigger:** Learner clicks "Take assessment" button in frontend

**Flow:**
1. Frontend calls `POST /api/v1/courses/:id/assessment/start`
2. `assessment.controller.js` validates course and learner
3. `assessmentGateway.js` builds payload and sends via Coordinator
4. Assessment service creates session and returns redirect URL

**Payload Structure:**
```json
{
  "requester_service": "course-builder-service",
  "payload": {
    "action": "create_assessment",
    "description": "Create a new assessment session for a learner to take a course exam",
    "learner_id": "uuid",
    "learner_name": "string",
    "course_id": "uuid",
    "course_name": "string"
  },
  "response": {}
}
```

**Response:**
```json
{
  "assessment_session_id": "uuid",
  "redirect_url": "https://assessment-service.com/exam-intro?examType=postcourse",
  "expires_in": 900
}
```

**Key Points:**
- ✅ `action` and `description` are included in payload (for Coordinator routing)
- ❌ `coverage_map` is NOT included in launch request (sent separately on demand)
- Response template is empty `{}`

---

### 2. COVERAGE MAP REQUEST (Assessment → Course Builder)
**Purpose:** Assessment service requests skill coverage map for exam generation

**Trigger:** Assessment service needs to know which skills are covered in the course

**Flow:**
1. Assessment service sends request via Coordinator
2. `assessmentHandler.js` routes to `handleCoverageMapRequest()`
3. Course Builder fetches lessons and builds coverage map dynamically
4. Returns coverage map to Assessment service

**Payload Structure (from Assessment):**
```json
{
  "requester_service": "assessment-service",
  "payload": {
    "action": "coverage map" | "coverage_map",
    "course_id": "uuid",
    "learner_id": "uuid",
    "learner_name": "string",
    "course_name": "string"
  }
}
```

**Response (to Assessment):**
```json
{
  "coverage_map": [
    {
      "lesson_id": "uuid",
      "skills": ["skill1", "skill2", ...]
    },
    ...
  ]
}
```

**Key Points:**
- ✅ Validates `requester_service === 'assessment-service'`
- ✅ Fetches lessons dynamically using `lessonFetcher.service.js`
- ✅ Builds coverage map from `lessons.skills` array (NOT stored in DB)
- ✅ Handles both `"coverage map"` and `"coverage_map"` action formats
- ✅ Handles typos like `"coverge map"` via normalization

---

### 3. EXAM RESULT REQUEST (Assessment → Course Builder)
**Purpose:** Assessment service sends exam results after learner completes exam

**Trigger:** Learner finishes exam in Assessment service

**Flow:**
1. Assessment service sends exam results via Coordinator
2. `assessmentHandler.js` routes to `handleExamResult()`
3. Course Builder normalizes `user_id` → `learner_id`
4. Stores exam result in `assessments` table
5. If learner passed (`passed === true`), triggers DevLab request (fire-and-forget)
6. Returns empty response `{}`

**Payload Structure (from Assessment):**
```json
{
  "requester_service": "assessment-service",
  "payload": {
    "user_id": "uuid",  // ⚠️ Normalized to learner_id
    "course_id": "uuid",
    "course_name": "string",
    "exam_type": "postcourse",
    "passing_grade": 70,
    "final_grade": 82,
    "passed": true
  }
}
```

**Response (to Assessment):**
```json
{}
```

**Key Points:**
- ✅ Normalizes `user_id` → `learner_id` (Assessment uses `user_id`, Course Builder uses `learner_id`)
- ✅ Validates `requester_service === 'assessment-service'`
- ✅ Stores all exam result fields in `assessments` table:
  - `learner_id` (normalized from `user_id`)
  - `course_id`
  - `course_name` (extracted but not stored - can be looked up)
  - `exam_type` (default: `'postcourse'`)
  - `passing_grade` (default: `70.00`)
  - `final_grade` (nullable)
  - `passed` (nullable)
- ✅ Creates new record or updates existing (by `learner_id` + `course_id`)
- ✅ Triggers DevLab request if `passed === true` (fire-and-forget, non-blocking)
- ✅ Returns empty response `{}` (Assessment doesn't need data back)

---

## Key Components

### 1. Assessment Gateway (`backend/services/gateways/assessmentGateway.js`)
**Purpose:** Outbound requests to Assessment service

**Function:** `sendToAssessment(course, learnerId, learnerName)`
- Builds payload using DTO builder
- Includes `action` and `description` for Coordinator routing
- Sends via Coordinator with digital signature
- Returns response with `redirect_url` and `assessment_session_id`

**Logging:**
- Full envelope JSON
- Payload details (action, description, learner_id, course_id, etc.)
- Response details (redirect_url, assessment_session_id, expires_in)

---

### 2. Assessment Handler (`backend/integration/handlers/assessmentHandler.js`)
**Purpose:** Inbound requests from Assessment service

**Function:** `handleAssessmentIntegration(payloadObject, responseTemplate, requesterService)`
- Routes requests based on `payload.action`:
  - `"coverage map"` / `"coverage_map"` → `handleCoverageMapRequest()`
  - Exam result fields → `handleExamResult()`
- Normalizes action strings (handles typos, case-insensitive)
- Validates `requester_service === 'assessment-service'`

**Sub-handlers:**
- `handleCoverageMapRequest()`: Fetches lessons, builds coverage map
- `handleExamResult()`: Normalizes data, stores result, triggers DevLab if passed
- `triggerDevLabRequest()`: Fire-and-forget DevLab request (non-blocking)

**Logging:**
- Comprehensive logging for all request types
- Full payload JSON
- Processing details
- Error handling with clear messages

---

### 3. Assessment DTO Builder (`backend/dtoBuilders/assessmentDTO.js`)
**Purpose:** Builds and normalizes payloads

**Functions:**
- `buildSendPayload()`: Builds outbound payload with `action`, `description`, `learner_id`, `course_id`, etc.
- `buildFromReceived()`: Normalizes inbound payload (`user_id` → `learner_id`)
- `buildCoverageMapFromLessons()`: Builds coverage map dynamically from lessons array

**Key Features:**
- ✅ Always includes `action` and `description` in send payload
- ✅ Normalizes `user_id` → `learner_id` for received payloads
- ✅ Coverage map built dynamically (NOT stored in DB)
- ✅ Defaults: `exam_type: 'postcourse'`, `passing_grade: 70.00`

---

### 4. Assessment Controller (`backend/controllers/assessment.controller.js`)
**Purpose:** REST API endpoint for frontend

**Endpoint:** `POST /api/v1/courses/:id/assessment/start`

**Function:** `startAssessment(req, res)`
- Validates course and learner
- Calls `assessmentGateway.sendToAssessment()`
- Returns redirect URL to frontend

**Request:**
- `courseId` from URL params
- `learner_id` from body or `X-User-Id` header
- `learner_name` from body or `X-User-Name` header

**Response:**
```json
{
  "assessment_session_id": "uuid",
  "redirect_url": "https://assessment-seven-liard.vercel.app/exam-intro?examType=postcourse",
  "expires_in": 900
}
```

---

## Data Flow

### Outbound (Course Builder → Assessment)

```
Frontend Request
    ↓
assessment.controller.js
    ↓
assessmentGateway.sendToAssessment()
    ↓
assessmentDTO.buildSendPayload()
    ↓
Coordinator (with signature)
    ↓
Assessment Service
```

**Payload Fields:**
- `action`: `"create_assessment"`
- `description`: `"Create a new assessment session for a learner to take a course exam"`
- `learner_id`: UUID
- `learner_name`: String
- `course_id`: UUID
- `course_name`: String
- `coverage_map`: Array (only if explicitly requested, NOT in launch request)

---

### Inbound (Assessment → Course Builder)

```
Assessment Service
    ↓
Coordinator (with signature)
    ↓
integration.controller.js
    ↓
integration.dispatcher.js
    ↓
assessmentHandler.handleAssessmentIntegration()
    ↓
handleCoverageMapRequest() OR handleExamResult()
    ↓
Response to Assessment
```

**Request Types:**
1. **Coverage Map Request:**
   - `action`: `"coverage map"` or `"coverage_map"`
   - Response: `{ coverage_map: [...] }`

2. **Exam Result:**
   - Fields: `user_id`, `course_id`, `exam_type`, `passing_grade`, `final_grade`, `passed`
   - Response: `{}`

---

## Database Schema

### `assessments` Table
```sql
CREATE TABLE assessments (
    id UUID PRIMARY KEY,
    learner_id UUID NOT NULL,
    learner_name TEXT,
    course_id UUID NOT NULL REFERENCES courses(id),
    exam_type exam_type NOT NULL DEFAULT 'postcourse',
    passing_grade NUMERIC(5,2) DEFAULT 70.00,
    final_grade NUMERIC(5,2),
    passed BOOLEAN
);
```

**Notes:**
- ❌ `coverage_map` is NOT stored (built dynamically from lessons)
- ❌ `course_name` is NOT stored (can be looked up from `courses` table)
- ✅ All exam result fields are stored
- ✅ `learner_id` is normalized from `user_id` (Assessment uses `user_id`)

---

## Security & Validation

### Request Validation
- ✅ `requester_service` must be `"assessment-service"` (case-insensitive)
- ✅ Required fields validated before processing
- ✅ Digital signatures verified by Coordinator

### Data Normalization
- ✅ `user_id` → `learner_id` (Assessment uses `user_id`, Course Builder uses `learner_id`)
- ✅ Action strings normalized (case-insensitive, handles typos)
- ✅ Default values applied (`exam_type: 'postcourse'`, `passing_grade: 70.00`)

---

## Error Handling

### Gateway Errors
- Coordinator request failures are logged and re-thrown
- Full error stack traces logged
- Clear error messages for debugging

### Handler Errors
- Validation errors are re-thrown (required fields, invalid requester)
- Other errors return empty response `{}` (don't break Assessment service)
- Comprehensive error logging with request details

---

## Logging

### Outbound Requests (Gateway)
- Full envelope JSON
- Payload details (action, description, learner_id, course_id, etc.)
- Response details (redirect_url, assessment_session_id, expires_in)

### Inbound Requests (Handler)
- Request type identification
- Full payload JSON
- Processing details
- Response details
- Clear separators for readability

---

## Integration Points

### 1. DevLab Integration
**Trigger:** When learner passes exam (`passed === true`)

**Flow:**
- `handleExamResult()` detects `passed === true`
- Calls `triggerDevLabRequest()` (fire-and-forget)
- Fetches learner name from registration
- Sends request to DevLab via Coordinator
- Non-blocking (doesn't wait for response)

### 2. Coordinator Integration
**Purpose:** All requests routed through Coordinator with signatures

**Features:**
- ECDSA P-256 digital signatures
- Service name: `course-builder-service`
- Automatic routing based on `action` field

---

## Key Features

1. **3-Request Flow:** Launch → Coverage Map → Exam Result
2. **Dynamic Coverage Map:** Built from lessons table, not stored
3. **Field Normalization:** `user_id` → `learner_id` handled automatically
4. **Action Normalization:** Handles typos and case variations
5. **Comprehensive Logging:** Full request/response logging for debugging
6. **DevLab Integration:** Automatic trigger when learner passes
7. **Error Resilience:** Returns empty response on errors (doesn't break Assessment)
8. **Security:** Request validation and digital signatures

---

## File Structure

```
backend/
├── controllers/
│   └── assessment.controller.js          # REST API endpoint
├── services/
│   └── gateways/
│       └── assessmentGateway.js         # Outbound requests
├── integration/
│   └── handlers/
│       └── assessmentHandler.js         # Inbound requests
├── dtoBuilders/
│   └── assessmentDTO.js                 # Payload builder/normalizer
└── repositories/
    └── AssessmentRepository.js          # Database operations
```

---

## Summary

The Assessment integration follows a **3-request flow** pattern:
1. **LAUNCH:** Course Builder sends basic course/learner info to start assessment
2. **COVERAGE MAP:** Assessment requests skill coverage map (built dynamically)
3. **EXAM RESULT:** Assessment sends exam results (stored, triggers DevLab if passed)

All communication is:
- ✅ Routed through Coordinator with digital signatures
- ✅ Validated (requester_service, required fields)
- ✅ Normalized (user_id → learner_id, action strings)
- ✅ Logged comprehensively
- ✅ Error-resilient (returns empty response on errors)

