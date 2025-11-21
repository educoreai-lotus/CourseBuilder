# All Integration Handlers - AI Usage Analysis

## Summary: Which Handlers Use AI?

| Handler | Uses AI? | What It Does |
|---------|----------|--------------|
| **Content Studio** | ❌ **NO** | Stores/retrieves course data from database |
| **Learner AI** | ❌ **NO** | Processes learner data, calls Content Studio |
| **Assessment** | ❌ **NO** | Stores/retrieves assessment results |
| **Directory** | ❌ **NO** | One-way communication (sends feedback) |
| **Skills Engine** | ❌ **NO** | Processes skills array |
| **Learning Analytics** | ❌ **NO** | One-way communication (sends analytics) |
| **Management Reporting** | ❌ **NO** | One-way communication (sends statistics) |
| **DevLab** | ❌ **NO** | One-way communication (sends exercises) |
| **Course Builder** | ✅ **YES** | Uses AI to generate SQL queries |

---

## Detailed Analysis

### 1. Content Studio Handler ❌ NO AI

**File**: `backend/integration/handlers/contentStudioHandler.js`

**What it does:**
- Receives course data from Content Studio
- Normalizes data (Content Studio format → Course Builder format)
- Checks database for existing course (Line 29)
- Creates course/topic/module/lesson if new
- Stores data in PostgreSQL
- Returns stored data from database

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation
- ❌ AI enrichment

**Response source:**
- ✅ Database data (newly created OR existing record)

---

### 2. Learner AI Handler ❌ NO AI

**File**: `backend/integration/handlers/learnerAIHandler.js`

**What it does:**
- Receives learner data from Learner AI
- Normalizes payload
- Calls Content Studio to generate lessons (Line 45)
- Creates course structure using Content Studio handler
- Returns empty response (one-way)

**Does NOT use:**
- ❌ AI/Gemini directly
- ❌ AI query generation

**Response source:**
- ✅ Empty response `{}` (one-way communication)

---

### 3. Assessment Handler ❌ NO AI

**File**: `backend/integration/handlers/assessmentHandler.js`

**What it does:**
- Receives assessment results from Assessment microservice
- Normalizes payload
- Creates/updates assessment record in database
- Returns assessment data

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Database data (assessment records)

---

### 4. Directory Handler ❌ NO AI

**File**: `backend/integration/handlers/directoryHandler.js`

**What it does:**
- Receives feedback data from Course Builder
- Logs the data
- Returns empty response (one-way)

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Empty response `{}` (one-way communication)

---

### 5. Skills Engine Handler ❌ NO AI

**File**: `backend/integration/handlers/skillsHandler.js`

**What it does:**
- Receives processed skills array from Skills Engine
- Normalizes payload
- Returns skills array

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Payload data (skills array from Skills Engine)

---

### 6. Learning Analytics Handler ❌ NO AI

**File**: `backend/integration/handlers/learningAnalyticsHandler.js`

**What it does:**
- Receives analytics data from Learning Analytics
- Logs the data
- Returns empty response template (one-way)

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Empty response template (one-way communication)

---

### 7. Management Reporting Handler ❌ NO AI

**File**: `backend/integration/handlers/managementReportingHandler.js`

**What it does:**
- Receives statistics from Management Reporting
- Logs the data
- Returns empty response template (one-way)

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Empty response template (one-way communication)

---

### 8. DevLab Handler ❌ NO AI

**File**: `backend/integration/handlers/devlabHandler.js`

**What it does:**
- Receives exercise completion data from DevLab
- Logs the data
- Returns empty response template (one-way)

**Does NOT use:**
- ❌ AI/Gemini
- ❌ AI query generation

**Response source:**
- ✅ Empty response template (one-way communication)

---

### 9. Course Builder Handler ✅ YES - USES AI!

**File**: `backend/integration/handlers/courseBuilderHandler.js`

**What it does:**
- Receives payload + response template
- Calls `fillContentMetrics` service (Line 24)
- Uses AI (Gemini) to generate SQL queries
- Executes SQL to fetch data from database
- Fills response template with database results
- Returns filled template

**Uses AI:**
- ✅ **AI Query Builder** (`backend/services/aiQueryBuilder.service.js`)
- ✅ **Gemini AI** (`gemini-2.5-flash` model)
- ✅ Generates SQL queries based on payload + template
- ✅ Executes SQL safely (SELECT-only)
- ✅ Fills response template with query results

**Response source:**
- ✅ **AI-generated SQL queries** → Database results → Filled template

**This is the ONLY handler that uses AI!**

---

## Where AI is Actually Used

### 1. Course Builder Handler (AI-Powered)
**Location**: `backend/integration/handlers/courseBuilderHandler.js`

**Flow**:
1. Receives `payload` + `response` template
2. Calls `fillContentMetrics` service
3. AI generates SQL query (Gemini)
4. Executes SQL query (database)
5. Fills template with results
6. Returns filled template

**Files involved**:
- `backend/integration/handlers/courseBuilderHandler.js` - Handler
- `backend/services/fillContentMetrics.service.js` - Orchestrator
- `backend/services/aiQueryBuilder.service.js` - **Uses Gemini AI** ✅
- `backend/services/queryExecutor.service.js` - Executes SQL
- `backend/utils/responseTemplateFiller.js` - Fills template

### 2. AI Query Builder Service (The AI Part)
**Location**: `backend/services/aiQueryBuilder.service.js`

**What it does:**
- Uses **Gemini AI** (`gemini-2.5-flash`)
- Generates SQL SELECT queries
- Based on payload structure + response template
- Validates query is SELECT-only (security)

---

## Summary for Your Postman Response

### What You Tested: Content Studio → Course Builder

**Your Request:**
```json
{
  "requester_service": "content_studio",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
    "course_name": "Advanced React Development",
    ...
  },
  "response": { "course": [] }
}
```

**What Happened:**
1. ✅ Course Builder received the request
2. ✅ Content Studio handler processed it (NO AI used)
3. ✅ Handler checked database for existing course
4. ✅ Found existing course with different name
5. ✅ Used existing course data
6. ✅ Added your new lesson to existing course
7. ✅ Returned existing course + new lesson

**Response Source:**
- ❌ **NOT AI-generated**
- ✅ **Database data** (existing course record)

---

## To Test AI Feature

If you want to test the **AI-powered feature**, use Course Builder as requester:

**Request**:
```json
{
  "requester_service": "course_builder",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789"
  },
  "response": {
    "course_id": "",
    "course_name": "",
    "total_lessons": 0
  }
}
```

**What happens:**
1. ✅ Routes to Course Builder handler
2. ✅ AI generates SQL query (Gemini)
3. ✅ Executes SQL to fetch course data
4. ✅ Fills template with results
5. ✅ Returns filled template

**This uses AI!** ✅

---

## Summary Table

| Handler | AI Used? | Response Source |
|---------|----------|-----------------|
| Content Studio | ❌ No | Database (newly created OR existing) |
| Learner AI | ❌ No | Empty `{}` (one-way) |
| Assessment | ❌ No | Database (assessment records) |
| Directory | ❌ No | Empty `{}` (one-way) |
| Skills Engine | ❌ No | Payload data (skills array) |
| Learning Analytics | ❌ No | Empty template (one-way) |
| Management Reporting | ❌ No | Empty template (one-way) |
| DevLab | ❌ No | Empty template (one-way) |
| **Course Builder** | ✅ **Yes** | **AI-generated SQL → Database → Filled template** |

---

## Conclusion

**Only 1 handler uses AI**: `courseBuilderHandler.js`

**All other handlers**: Just process/store data from database or return empty responses.

**Your Postman response**: Was **NOT AI-generated** - it was database data (existing course record).

