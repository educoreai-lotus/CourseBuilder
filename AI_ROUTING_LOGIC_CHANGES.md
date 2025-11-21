# AI Routing Logic Implementation - Changes Summary

## Overview

Completely refactored the routing logic for `/api/fill-content-metrics` endpoint to use AI **ONLY** when response template has fields to fill. The old logic that checked payload structure to determine AI usage has been removed.

---

## Key Changes

### 1. New Routing Logic ✅

**OLD Logic (REMOVED):**
- Checked payload structure (topics, user_id, coverage_map, etc.) to determine which handler to use
- AI was only used as a fallback when payload didn't match any pattern
- Required specific payload patterns to route to specialized handlers

**NEW Logic (IMPLEMENTED):**
- **AI is used ONLY when response template has fields to fill**
- If response template has fields → Route to Course Builder Handler (AI)
- If response template is empty `{}` → Route to specialized handler based on payload structure

---

## Files Updated

### 1. `backend/controllers/integration.controller.js`

**Changes:**
- ✅ Removed `inferTargetServiceFromPayload()` function that checked payload fields
- ✅ Added `responseTemplateHasFields()` function to check if template has fields
- ✅ Added `inferSpecializedServiceFromPayload()` function for empty response templates
- ✅ Added `determineTargetService()` function that implements new routing logic:

```javascript
function determineTargetService(payloadObject, responseTemplate) {
  // If response template has fields → Use AI-powered Course Builder Handler
  if (responseTemplateHasFields(responseTemplate)) {
    return 'CourseBuilder';
  }
  
  // If response template is empty → Use specialized handler
  return inferSpecializedServiceFromPayload(payloadObject);
}
```

---

### 2. `backend/integration/dispatcher.js`

**Changes:**
- ✅ Updated comments to clarify that response template can be empty `{}` for specialized handlers
- ✅ Updated validation to allow empty response templates (only requires it to be an object)

---

### 3. `backend/services/aiQueryBuilder.service.js`

**Changes:**
- ✅ Updated AI system prompt to use exact prompt from requirements:
  - "You are the 'Course Builder SQL Generator' — an expert system..."
  - Emphasizes: Output ONLY raw SQL. No Markdown. No explanations.
- ✅ Added `responseTemplateHasFields()` safety check before invoking AI
- ✅ Throws error if response template is empty (defensive check)

---

### 4. `backend/integration/handlers/courseBuilderHandler.js`

**Changes:**
- ✅ Added safety check to ensure response template has fields before calling AI
- ✅ Added defensive check that returns `{}` if template is empty (should not happen due to routing logic)

---

### 5. `backend/routes/integration.routes.js`

**Changes:**
- ✅ Updated route comments to reflect new routing logic:
  - If response template has fields → Course Builder Handler (AI)
  - If response template is empty → Specialized handler

---

## How It Works Now

### Scenario 1: AI is Used ✅

**Request:**
```json
{
  "requester_service": "content_studio",
  "payload": {
    "course_id": "abc123"
  },
  "response": {
    "course_name": "",
    "total_lessons": 0
  }
}
```

**What Happens:**
1. Controller checks `responseTemplateHasFields()` → **TRUE** (has `course_name` and `total_lessons`)
2. Routes to **Course Builder Handler** (AI)
3. AI generates SQL query
4. Executes SQL to fetch data
5. Fills response template
6. Returns filled response

**Result:** ✅ AI is used

---

### Scenario 2: AI is NOT Used (Empty Response Template) ✅

**Request:**
```json
{
  "requester_service": "content_studio",
  "payload": {
    "topics": [...]
  },
  "response": {}
}
```

**What Happens:**
1. Controller checks `responseTemplateHasFields()` → **FALSE** (empty `{}`)
2. Routes to **Content Studio Handler** (specialized handler)
3. Stores data in database
4. Returns empty response `{}`

**Result:** ✅ AI is NOT used (specialized handler)

---

### Scenario 3: AI is NOT Used (One-Way Communication) ✅

**Request:**
```json
{
  "requester_service": "learner_ai",
  "payload": {
    "user_id": "lnr_123",
    "skills": ["react", "hooks"]
  },
  "response": {}
}
```

**What Happens:**
1. Controller checks `responseTemplateHasFields()` → **FALSE** (empty `{}`)
2. Routes to **Learner AI Handler** (specialized handler)
3. Processes request and creates course
4. Returns empty response `{}`

**Result:** ✅ AI is NOT used (specialized handler)

---

## What Was Removed ❌

### Old Routing Logic (REMOVED)

```javascript
// ❌ REMOVED - This logic checked payload fields to determine routing
function inferTargetServiceFromPayload(payloadObject, responseTemplate) {
  if (payloadObject.topics || (payloadObject.learner_id && payloadObject.skills)) {
    return 'ContentStudio';  // ❌ WRONG - This blocked AI
  }
  if (payloadObject.user_id || payloadObject.competency_name) {
    return 'LearnerAI';  // ❌ WRONG - This blocked AI
  }
  // ... more patterns that blocked AI ...
  
  // Only used AI as fallback
  if (responseTemplate && typeof responseTemplate === 'object') {
    return 'CourseBuilder';  // ❌ WRONG - AI was only a fallback
  }
}
```

---

## New Routing Logic ✅

```javascript
// ✅ NEW - This logic checks ONLY response template fields
function determineTargetService(payloadObject, responseTemplate) {
  // 1. If response template has fields → AI is used
  if (responseTemplateHasFields(responseTemplate)) {
    return 'CourseBuilder';  // ✅ AI-powered handler
  }
  
  // 2. If response template is empty → Specialized handler
  return inferSpecializedServiceFromPayload(payloadObject);  // ✅ Specialized handler
}
```

---

## Key Rules

### ✅ AI is Used When:
- Response template exists AND has at least one field to fill
- Example: `"response": { "course_name": "", "total_lessons": 0 }`

### ❌ AI is NOT Used When:
- Response template is empty `{}`
- Response template is missing (defaults to `{}`)
- Example: `"response": {}` or `"response": undefined`

### ✅ Routing is Based On:
- **Response template fields** (for AI usage)
- **Payload structure** (for specialized handlers when response is empty)

### ❌ Routing is NOT Based On:
- `requester_service` value (doesn't matter)
- Payload structure (when response has fields, AI is always used)

---

## Testing

### Test 1: AI is Used

```bash
POST /api/fill-content-metrics
{
  "requester_service": "content_studio",
  "payload": {
    "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789"
  },
  "response": {
    "course_name": "",
    "total_lessons": 0
  }
}
```

**Expected:** Routes to Course Builder Handler (AI) ✅

---

### Test 2: AI is NOT Used (Empty Response)

```bash
POST /api/fill-content-metrics
{
  "requester_service": "content_studio",
  "payload": {
    "topics": [...]
  },
  "response": {}
}
```

**Expected:** Routes to Content Studio Handler (specialized) ✅

---

### Test 3: AI is NOT Used (Missing Response)

```bash
POST /api/fill-content-metrics
{
  "requester_service": "learner_ai",
  "payload": {
    "user_id": "lnr_123"
  }
}
```

**Expected:** Routes to Learner AI Handler (specialized) ✅

---

## Summary

✅ **AI routing logic is now correct:**
- AI is used **ONLY** when response template has fields to fill
- AI is **NOT** used when response template is empty
- Routing is based on response template, not payload structure
- Old routing logic based on payload fields has been completely removed

✅ **System is now predictable and aligned with intended architecture**

