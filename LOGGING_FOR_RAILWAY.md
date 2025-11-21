# Enhanced Logging for Railway - Gemini AI Tracking

## Overview

Added comprehensive logging throughout the AI query generation flow to make it clear when Gemini AI is being called and used in Railway logs.

---

## Log Flow (What You'll See in Railway Logs)

### 1. Request Arrives at Controller

```
[Integration Controller] 🔍 Determining target service...
[Integration Controller] Response template has fields: true
[Integration Controller] ✅ Target service determined: CourseBuilder
[Integration Controller] 📤 Routing to CourseBuilder handler...
[Integration Controller] 🤖 Using AI-powered Course Builder Handler (Gemini AI will be called)
```

### 2. Course Builder Handler Starts

```
[Course Builder Handler] Processing request with AI-powered query generation
[Course Builder Handler] Payload: { ... }
[Course Builder Handler] Response Template: { ... }
```

### 3. Fill Content Metrics Service Starts

```
[Fill Content Metrics] Generating SQL query...
```

### 4. AI Query Builder - Gemini AI Called 🚀

```
[AI Query Builder] Initializing Gemini AI...
[AI Query Builder] ✅ Gemini AI initialized with model: gemini-2.5-flash
[AI Query Builder] Building prompt with field normalization rules...
[AI Query Builder] ✅ Prompt built successfully
[AI Query Builder] 🚀 Calling Gemini AI to generate SQL query...
[AI Query Builder] ✅ Gemini AI responded in 1234ms
[AI Query Builder] Raw AI response length: 245 characters
[AI Query Builder] Extracting SQL from AI response...
[AI Query Builder] ✅ SQL extracted: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons FROM courses...
[AI Query Builder] Validating SQL query (SELECT-only check)...
[AI Query Builder] ✅ SQL query validated successfully
[AI Query Builder] ✅ Final SQL query generated: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
```

### 5. SQL Execution

```
[Fill Content Metrics] Generated SQL: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
[Fill Content Metrics] Query params: ['d0e1f2a3-b4c5-6789-ef01-890123456789']
[Fill Content Metrics] Executing query...
[Query Executor] 🔍 Executing SQL query with params: ['d0e1f2a3-b4c5-6789-ef01-890123456789']
[Query Executor] SQL Query: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
[Query Executor] ✅ Query executed successfully in 45ms
[Query Executor] Query results: {"course_name":"Advanced React Development","total_lessons":5}...
[Fill Content Metrics] Query results: [ ... ]
```

### 6. Template Filling and Response

```
[Fill Content Metrics] Filling template...
[Fill Content Metrics] Filled template: { ... }
[Course Builder Handler] Filled template: { ... }
[Integration Controller] ✅ CourseBuilder handler completed successfully
```

---

## How to Verify Gemini is Working in Railway

### Step 1: Check Logs When AI is Used

**Send this request in Postman:**

```json
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

### Step 2: Look for These Log Messages

**✅ If Gemini is Working, You'll See:**

1. `[Integration Controller] 🤖 Using AI-powered Course Builder Handler (Gemini AI will be called)`
2. `[AI Query Builder] Initializing Gemini AI...`
3. `[AI Query Builder] ✅ Gemini AI initialized with model: gemini-2.5-flash`
4. `[AI Query Builder] 🚀 Calling Gemini AI to generate SQL query...`
5. `[AI Query Builder] ✅ Gemini AI responded in Xms`

**❌ If Gemini is NOT Working, You'll See:**

1. `[AI Query Builder] ❌ Error generating SQL query: GEMINI_API_KEY not configured...`
2. OR: `[AI Query Builder] ❌ Error generating SQL query: Failed to generate SQL query...`

---

## Troubleshooting

### Problem: No Gemini logs appear

**Possible Causes:**
1. ❌ Request is routing to specialized handler (response template is empty `{}`)
2. ❌ GEMINI_API_KEY not set in Railway environment variables
3. ❌ Request is failing before reaching AI handler

**Solution:**
1. ✅ Check that response template has fields to fill (not empty `{}`)
2. ✅ Verify GEMINI_API_KEY is set in Railway
3. ✅ Check controller logs to see which handler was called

### Problem: See "Gemini AI will be called" but no "Gemini AI responded"

**Possible Causes:**
1. ❌ Gemini API call is failing silently
2. ❌ Network issue connecting to Gemini API
3. ❌ API key is invalid

**Solution:**
1. ✅ Check error logs after "Calling Gemini AI"
2. ✅ Verify GEMINI_API_KEY is valid
3. ✅ Check Railway network connectivity

---

## Example: Complete Log Flow (Success)

```
2025-11-21T22:00:00.000Z - POST /api/fill-content-metrics
[Integration Controller] 🔍 Determining target service...
[Integration Controller] Response template has fields: true
[Integration Controller] ✅ Target service determined: CourseBuilder
[Integration Controller] 📤 Routing to CourseBuilder handler...
[Integration Controller] 🤖 Using AI-powered Course Builder Handler (Gemini AI will be called)
[Course Builder Handler] Processing request with AI-powered query generation
[Course Builder Handler] Payload: { "course_id": "abc123" }
[Course Builder Handler] Response Template: { "course_name": "", "total_lessons": 0 }
[Fill Content Metrics] Generating SQL query...
[AI Query Builder] Initializing Gemini AI...
[AI Query Builder] ✅ Gemini AI initialized with model: gemini-2.5-flash
[AI Query Builder] Building prompt with field normalization rules...
[AI Query Builder] ✅ Prompt built successfully
[AI Query Builder] 🚀 Calling Gemini AI to generate SQL query...
[AI Query Builder] ✅ Gemini AI responded in 1234ms
[AI Query Builder] Raw AI response length: 245 characters
[AI Query Builder] Extracting SQL from AI response...
[AI Query Builder] ✅ SQL extracted: SELECT courses.course_name...
[AI Query Builder] Validating SQL query (SELECT-only check)...
[AI Query Builder] ✅ SQL query validated successfully
[AI Query Builder] ✅ Final SQL query generated: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
[Fill Content Metrics] Generated SQL: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
[Fill Content Metrics] Query params: ['abc123']
[Fill Content Metrics] Executing query...
[Query Executor] 🔍 Executing SQL query with params: ['abc123']
[Query Executor] SQL Query: SELECT courses.course_name, COUNT(lessons.id) AS total_lessons...
[Query Executor] ✅ Query executed successfully in 45ms
[Query Executor] Query results: {"course_name":"Advanced React","total_lessons":5}...
[Fill Content Metrics] Query results: [ ... ]
[Fill Content Metrics] Filling template...
[Fill Content Metrics] Filled template: { "course_name": "Advanced React", "total_lessons": 5 }
[Course Builder Handler] Filled template: { "course_name": "Advanced React", "total_lessons": 5 }
[Integration Controller] ✅ CourseBuilder handler completed successfully
```

---

## Example: Complete Log Flow (AI Not Used)

```
2025-11-21T22:00:00.000Z - POST /api/fill-content-metrics
[Integration Controller] 🔍 Determining target service...
[Integration Controller] Response template has fields: false
[Integration Controller] ✅ Target service determined: ContentStudio
[Integration Controller] 📤 Routing to ContentStudio handler...
[ContentStudio Handler] Processing request...
[ContentStudio Handler] Storing course data...
[Integration Controller] ✅ ContentStudio handler completed successfully
```

**Note:** No Gemini logs because response template is empty - routes to specialized handler.

---

## Key Indicators

### ✅ Gemini is Working
- See: `🚀 Calling Gemini AI to generate SQL query...`
- See: `✅ Gemini AI responded in Xms`
- See: `✅ Final SQL query generated: ...`

### ❌ Gemini is NOT Working
- See: `❌ Error generating SQL query: ...`
- OR: No logs starting with `[AI Query Builder]`

### ❌ AI Not Called (Expected)
- See: `Response template has fields: false`
- See: Routes to specialized handler (ContentStudio, Assessment, etc.)
- No Gemini logs (this is correct - AI only used when response has fields)

---

## Summary

The enhanced logging will now clearly show:
1. ✅ When routing decides to use AI
2. ✅ When Gemini AI is initialized
3. ✅ When Gemini AI is called
4. ✅ How long Gemini AI takes to respond
5. ✅ The SQL query generated by Gemini
6. ✅ When SQL is executed
7. ✅ The results returned

All logs are prefixed with service names like `[AI Query Builder]`, `[Course Builder Handler]`, etc., making them easy to find in Railway logs.

