# Postman Testing Guide: AI-Powered Smart Query Builder

This guide shows you exactly how to test the `POST /api/fill-content-metrics` endpoint using Postman.

## Prerequisites

1. **Postman installed** (download from https://www.postman.com/downloads/)
2. **Server running**: Make sure your backend server is running on `http://localhost:3000`
3. **Environment variables set**: `GEMINI_API_KEY` and `DATABASE_URL` must be configured

## Step-by-Step Postman Setup

### Step 1: Create a New Request

1. Open Postman
2. Click **"New"** button (top left)
3. Select **"HTTP Request"**
4. Or click **"+"** tab to create a new request

### Step 2: Configure Request Method and URL

1. **Method**: Select `POST` from the dropdown (left of URL bar)
2. **URL**: Enter `http://localhost:3000/api/fill-content-metrics`

**Full URL should look like:**
```
POST http://localhost:3000/api/fill-content-metrics
```

### Step 3: Set Headers

1. Click on the **"Headers"** tab (below URL bar)
2. Add these headers:

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

**Visual Guide:**
```
Headers Tab:
┌─────────────────────────┬─────────────────────────┐
│ Key                     │ Value                   │
├─────────────────────────┼─────────────────────────┤
│ Content-Type            │ application/json        │
└─────────────────────────┴─────────────────────────┘
```

### Step 4: Set Request Body

1. Click on the **"Body"** tab (below URL bar)
2. Select **"raw"** radio button
3. In the dropdown on the right, select **"JSON"** (should show "Text" or "JSON")

4. Paste this JSON in the body field:

```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"your-course-id-here\"}",
  "response": "{\"total_lessons\": 0, \"average_rating\": 0}"
}
```

**Important Notes:**
- Replace `"your-course-id-here"` with a **real course ID** from your database
- The `payload` field is a **stringified JSON** (double quotes inside quotes)
- The `response` field is also a **stringified JSON** (template to fill)

### Step 5: Send Request

1. Click the blue **"Send"** button (top right)
2. Wait for the response (may take a few seconds as AI generates SQL)

## Example Requests for Postman

### Example 1: Get Course Metrics (Total Lessons + Average Rating)

**Body:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\"}",
  "response": "{\"total_lessons\": 0, \"average_rating\": 0}"
}
```

**Expected Response:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\"}",
  "response": "{\"total_lessons\": 15, \"average_rating\": 4.5}"
}
```

**Note**: The `response` field is stringified. To see the actual values, parse it:
- Copy the `response` value: `"{\"total_lessons\": 15, \"average_rating\": 4.5}"`
- Paste into a JSON parser or use Postman's "Pretty" view

### Example 2: Get Course Title and Level

**Body:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\"}",
  "response": "{\"title\": \"\", \"level\": \"\", \"rating\": 0}"
}
```

**Expected Response:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\"}",
  "response": "{\"title\": \"Introduction to Programming\", \"level\": \"beginner\", \"rating\": 4.5}"
}
```

### Example 3: Get Enrollment Count

**Body:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\"}",
  "response": "{\"total_enrollments\": 0, \"active_enrollments\": 0}"
}
```

### Example 4: Get Learner Progress

**Body:**
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123-course-id\", \"learner_id\": \"learner-123\"}",
  "response": "{\"progress\": 0, \"completed_lessons\": 0, \"total_lessons\": 0}"
}
```

## How to Get a Real Course ID

### Option 1: Query Your Database

Connect to your PostgreSQL database and run:
```sql
SELECT id FROM courses LIMIT 1;
```

Copy the `id` value and use it in the request.

### Option 2: Use the Courses API First

1. In Postman, create a new request:
   - **Method**: `GET`
   - **URL**: `http://localhost:3000/api/v1/courses`

2. Send the request
3. Copy a `course_id` from the response
4. Use it in your `/api/fill-content-metrics` request

## What to Look For in Postman

### ✅ Success Indicators

1. **Status Code**: Should be `200 OK` (green)
2. **Response Time**: May take 3-10 seconds (AI generation + query execution)
3. **Response Body**: Should contain:
   - `requester_service: "CourseBuilder"`
   - `payload`: Same as request
   - `response`: Stringified JSON with **filled values** (not zeros)

### 📋 Response Format

```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc-123\"}",
  "response": "{\"total_lessons\": 15, \"average_rating\": 4.5}"
}
```

**To see filled values clearly:**
1. Click **"Body"** tab in response
2. Select **"Pretty"** format (dropdown on right)
3. Copy the `response` value
4. Use a JSON parser to see the actual filled template

### ❌ Error Scenarios

#### Error 1: "GEMINI_API_KEY not configured"
```json
{
  "error": "Internal Server Error",
  "message": "GEMINI_API_KEY not configured. Cannot generate SQL queries."
}
```
**Fix**: Set `GEMINI_API_KEY` in your `.env` file

#### Error 2: "Security violation"
```json
{
  "error": "Security violation: Query contains forbidden keyword: INSERT"
}
```
**Fix**: This is expected - the system blocks non-SELECT queries for security

#### Error 3: "Query execution failed"
```json
{
  "error": "Query execution failed: relation 'courses' does not exist"
}
```
**Fix**: Database schema not set up. Run migrations.

#### Error 4: "Bad Request"
```json
{
  "error": "Bad Request",
  "message": "Envelope must include only 'requester_service', 'payload', and 'response'"
}
```
**Fix**: Check your request body format - all three fields are required

## Postman Collection (Optional)

### Create a Postman Collection

1. Click **"New"** → **"Collection"**
2. Name it: `Course Builder API`
3. Click **"Add Request"** under the collection
4. Follow steps above to configure the request
5. Save it for future use

### Add Environment Variables (Optional)

1. Click gear icon (top right) → **"Manage Environments"**
2. Click **"Add"** to create a new environment
3. Add variables:
   - `base_url`: `http://localhost:3000`
   - `course_id`: `your-course-id-here`

4. Use in request URL: `{{base_url}}/api/fill-content-metrics`
5. Use in body: `"course_id": "{{course_id}}"`

## Visual Postman Setup Guide

```
Postman Window:
┌─────────────────────────────────────────────────────────┐
│ [New] [Import] [Runner] ...                      [Sync] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [POST ▼]  http://localhost:3000/api/fill-content-...   │
│                                                           │
│  [Params] [Authorization] [Headers] [Body] [Pre-request │
│                                                           │
│  Headers Tab:                                             │
│  ┌─────────────────────┬─────────────────────┐          │
│  │ Content-Type        │ application/json    │          │
│  └─────────────────────┴─────────────────────┘          │
│                                                           │
│  Body Tab:                                                │
│  ○ none  ○ form-data  ○ x-www-form-urlencoded            │
│  ● raw  ○ binary  ○ GraphQL                              │
│  [JSON ▼]                                                 │
│                                                           │
│  {                                                         │
│    "requester_service": "CourseBuilder",                  │
│    "payload": "{\"course_id\": \"abc-123\"}",            │
│    "response": "{\"total_lessons\": 0}"                   │
│  }                                                         │
│                                                           │
│                                           [Send]          │
└─────────────────────────────────────────────────────────┘
```

## Testing Checklist in Postman

- [ ] Server is running (`http://localhost:3000`)
- [ ] Request method is `POST`
- [ ] URL is correct: `http://localhost:3000/api/fill-content-metrics`
- [ ] Headers include: `Content-Type: application/json`
- [ ] Body is set to `raw` → `JSON`
- [ ] Request body has all three fields: `requester_service`, `payload`, `response`
- [ ] `course_id` in payload is a real ID from database
- [ ] Status code is `200 OK`
- [ ] Response contains filled values (not zeros)

## Tips for Postman Testing

1. **Save Requests**: Save successful requests for reuse
2. **Use Collections**: Organize requests in collections
3. **Test Variables**: Use environment variables for easy changes
4. **Check Logs**: Keep server logs open to see AI generation process
5. **Pretty Format**: Use "Pretty" format in Postman to view JSON clearly
6. **Copy Response**: Copy `response` field and parse separately to see filled values

## Troubleshooting in Postman

### Request Timeout
- **Problem**: Request takes too long (>30 seconds)
- **Fix**: Check server logs - AI generation may be slow, or database query is hanging

### No Response
- **Problem**: No response from server
- **Fix**: Check if server is running, check server logs for errors

### Invalid JSON
- **Problem**: "Invalid JSON" error
- **Fix**: Make sure `payload` and `response` fields are **stringified JSON** (double-quoted strings)

### Wrong Format
- **Problem**: Response format is incorrect
- **Fix**: Check that `requester_service` is exactly `"CourseBuilder"` (case-sensitive)

## Next Steps

1. Test with different course IDs
2. Try different response template structures
3. Test error scenarios (invalid course_id, missing fields, etc.)
4. Monitor response times
5. Check server logs to see AI-generated SQL queries

---

**Ready to test!** Follow the steps above and you should be able to test the AI-powered Smart Query Builder feature in Postman. 🚀

