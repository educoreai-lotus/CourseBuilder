# Testing Guide: AI-Powered Smart Query Builder

This guide explains how to test the new AI-powered Smart Query Builder feature at `POST /api/fill-content-metrics`.

## Prerequisites

1. **Environment Variables**:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=your_database_connection_string
   ```

2. **Server Running**:
   ```bash
   cd backend
   npm start
   # Or
   node server.js
   ```

3. **Database Setup**: Ensure your PostgreSQL database has the Course Builder schema with tables:
   - `courses`
   - `topics`
   - `modules`
   - `lessons`
   - `feedback`
   - `enrollments`

## Testing Methods

### Method 1: Using cURL

#### Test 1: Get Course Metrics (Total Lessons + Average Rating)

```bash
curl -X POST http://localhost:3000/api/fill-content-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "requester_service": "CourseBuilder",
    "payload": "{\"course_id\": \"your-course-id-here\"}",
    "response": "{\"total_lessons\": 0, \"average_rating\": 0}"
  }'
```

**Expected Response**:
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"your-course-id-here\"}",
  "response": "{\"total_lessons\": 15, \"average_rating\": 4.5}"
}
```

#### Test 2: Get Enrollment Count

```bash
curl -X POST http://localhost:3000/api/fill-content-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "requester_service": "CourseBuilder",
    "payload": "{\"course_id\": \"your-course-id-here\"}",
    "response": "{\"total_enrollments\": 0, \"active_enrollments\": 0}"
  }'
```

#### Test 3: Get Learner Progress

```bash
curl -X POST http://localhost:3000/api/fill-content-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "requester_service": "CourseBuilder",
    "payload": "{\"course_id\": \"your-course-id-here\", \"learner_id\": \"your-learner-id-here\"}",
    "response": "{\"progress\": 0, \"completed_lessons\": 0, \"total_lessons\": 0}"
  }'
```

### Method 2: Using Postman

1. **Create New Request**:
   - Method: `POST`
   - URL: `http://localhost:3000/api/fill-content-metrics`

2. **Headers**:
   ```
   Content-Type: application/json
   ```

3. **Body** (raw JSON):
   ```json
   {
     "requester_service": "CourseBuilder",
     "payload": "{\"course_id\": \"your-course-id-here\"}",
     "response": "{\"total_lessons\": 0, \"average_rating\": 0}"
   }
   ```

4. **Send Request** and check response

### Method 3: Using JavaScript/Node.js

```javascript
const axios = require('axios');

async function testFillContentMetrics() {
  try {
    const response = await axios.post('http://localhost:3000/api/fill-content-metrics', {
      requester_service: 'CourseBuilder',
      payload: JSON.stringify({
        course_id: 'your-course-id-here'
      }),
      response: JSON.stringify({
        total_lessons: 0,
        average_rating: 0
      })
    });
    
    console.log('Response:', response.data);
    
    // Parse the stringified response
    const filledTemplate = JSON.parse(response.data.response);
    console.log('Filled Template:', filledTemplate);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFillContentMetrics();
```

## What to Check

### 1. Server Logs

When the request is processed, you should see logs like:

```
[Fill Content Metrics] Generating SQL query...
[Fill Content Metrics] Generated SQL: SELECT COUNT(lessons.id) AS total_lessons, AVG(feedback.rating) AS average_rating...
[Fill Content Metrics] Query params: ['your-course-id']
[Fill Content Metrics] Executing query...
[Fill Content Metrics] Query results: { total_lessons: 15, average_rating: 4.5 }
[Fill Content Metrics] Filling template...
[Fill Content Metrics] Filled template: { total_lessons: 15, average_rating: 4.5 }
```

### 2. Response Validation

✅ **Success Indicators**:
- HTTP Status: `200 OK`
- Response contains `requester_service: "CourseBuilder"`
- Response `payload` matches request payload
- Response `response` is a **stringified JSON** with filled values

✅ **Template Filled Correctly**:
- Template field names match response field names
- Numeric values are filled (not 0 unless actual value is 0)
- Values come from database (not hard-coded)

### 3. Error Scenarios

#### Error: GEMINI_API_KEY not configured
```
Error: GEMINI_API_KEY not configured. Cannot generate SQL queries.
```
**Fix**: Set `GEMINI_API_KEY` environment variable

#### Error: Security violation
```
Error: Security violation: Query contains forbidden keyword: INSERT
```
**Fix**: AI generated wrong query type. Check AI prompt and query validation.

#### Error: Query execution failed
```
Error: Query execution failed: relation "courses" does not exist
```
**Fix**: Database schema not set up correctly. Run migrations.

#### Error: Invalid template
```
Error: Invalid template: responseTemplate must be an object
```
**Fix**: Check that `response` field is valid JSON string.

## Testing Checklist

- [ ] Server starts without errors
- [ ] Environment variables set correctly (GEMINI_API_KEY, DATABASE_URL)
- [ ] Database connection working
- [ ] Endpoint responds to POST requests
- [ ] AI generates SQL query successfully
- [ ] Query is SELECT-only (security check passes)
- [ ] Query executes successfully
- [ ] Template fills with actual database values
- [ ] Response format matches expected structure
- [ ] Error handling works for invalid requests

## Example Test Cases

### Test Case 1: Basic Metrics
**Request**:
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc123\"}",
  "response": "{\"total_lessons\": 0}"
}
```

**Expected**: `{"total_lessons": <actual_count>}`

### Test Case 2: Multiple Fields
**Request**:
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc123\"}",
  "response": "{\"title\": \"\", \"level\": \"\", \"rating\": 0}"
}
```

**Expected**: All fields filled from course data

### Test Case 3: Nested Template
**Request**:
```json
{
  "requester_service": "CourseBuilder",
  "payload": "{\"course_id\": \"abc123\"}",
  "response": "{\"metrics\": {\"lessons\": 0, \"modules\": 0}}"
}
```

**Expected**: Nested structure filled correctly

## Debugging Tips

1. **Check Console Logs**: All steps are logged with `[Fill Content Metrics]` prefix
2. **Verify AI Generated Query**: Check logs for the generated SQL
3. **Test SQL Manually**: Copy generated SQL and test in database directly
4. **Check Parameter Mapping**: Verify parameters extracted correctly from payload
5. **Validate Template Structure**: Ensure response template structure matches database schema

## Next Steps

1. Test with real course IDs from your database
2. Try different response template structures
3. Test error scenarios (invalid course_id, missing fields, etc.)
4. Monitor performance (AI generation time, query execution time)
5. Check security (ensure only SELECT queries are generated)

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are set
3. Ensure database is accessible and schema is correct
4. Test AI API key directly with Gemini API
5. Review the generated SQL query in logs

