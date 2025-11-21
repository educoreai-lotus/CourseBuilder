# Content Studio Handler - What It Does

## Is the Response AI-Generated? **NO** ❌

The Content Studio handler **does NOT use AI**. Here's what it actually does:

---

## What the Content Studio Handler Does

### Step 1: Receives Data from Content Studio
- Receives payload with course data (course_name, topics, etc.)

### Step 2: Normalizes Data
- Converts Content Studio format to Course Builder format
- Maps `topics[]` → `lessons[]`

### Step 3: Checks Database
```javascript
let course = await courseRepository.findById(normalized.course_id);  // Line 29
```

**Important**: If the course already exists in the database, it uses that existing course!

### Step 4: Creates/Stores Data
- Creates course in database (if new)
- Creates topic → module → lessons structure
- Stores everything in PostgreSQL

### Step 5: Returns Stored Data
- Returns the course data from the database
- **NOT AI-generated** - just returns what was stored

---

## Why Your Response Had Different Course Name

**You sent:**
```json
"course_name": "Advanced React Development"
```

**You received:**
```json
"course_name": "Data Engineering and Big Data Analytics"
```

### Reason: Course ID Already Exists in Database

The handler checked the database first:
```javascript
let course = await courseRepository.findById(normalized.course_id);  // Line 29
// If course exists → uses existing course (returns old name)
// If course doesn't exist → creates new course (returns new name)
```

**What happened:**
- Your `course_id`: `"d0e1f2a3-b4c5-6789-ef01-890123456789"` already exists in the database
- The handler found this existing course
- It used the existing course data (with name "Data Engineering...")
- It added your new lesson to this existing course
- Returned the existing course data with the new lesson

---

## Where AI IS Used in Your Project

### 1. AI Query Builder (`backend/services/aiQueryBuilder.service.js`)
- Used for Course Builder's own `/api/fill-content-metrics` endpoint
- Uses Gemini AI to generate SQL queries
- **NOT used in Content Studio handler**

### 2. AI Enrichment (Future/Other Features)
- AI enrichment for lessons (YouTube, GitHub resources)
- This is a separate feature, not in Content Studio handler

---

## Summary

| Feature | Uses AI? | What It Does |
|---------|----------|--------------|
| **Content Studio Handler** | ❌ **NO** | Stores/retrieves data from database |
| **AI Query Builder** | ✅ **YES** | Generates SQL queries using Gemini |
| **AI Enrichment** | ✅ **YES** | Adds metadata/resources to lessons (separate feature) |

---

## The Response You Got is:

- **NOT AI-generated** ❌
- **Database data** ✅ (either newly created OR fetched from existing record)
- **What you sent** ✅ (if course was new) OR **existing course data** (if course ID existed)

---

## To Get Your Exact Course Name

**Option 1: Use a new course ID**
```json
{
  "course_id": "new-unique-uuid-here"  // Generate a new UUID
}
```

**Option 2: Clear the database first**
```bash
node backend/scripts/clearDatabase.js
node backend/scripts/seedMockData.js
```

---

## Code Location

**File**: `backend/integration/handlers/contentStudioHandler.js`

**Lines 28-52**: Checks database, creates course if new
**Lines 75-91**: Creates lessons from your payload
**Lines 102-126**: Returns stored course data (NOT AI-generated)

