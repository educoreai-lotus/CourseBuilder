# Fallback Data Strategy

## Overview
All integration handlers now include **actual mock/fallback data** stored in `backend/integration/fallbackData.js` to ensure the response contract is always met, even when:
- Database operations fail
- External service URLs are unavailable (network errors, timeouts, 503, 504, 502)
- Required data is missing from payload
- Any unexpected errors occur

## Mock Data Location
All fallback data is stored in: `backend/integration/fallbackData.js`

This file contains real sample data for each service that can be used when services are unavailable.

## Fallback Behavior by Service

### 1. Content Studio
**Fallback Strategy:**
- **Network Errors**: Uses mock data from `fallbackData.ContentStudio.learner_specific` or `fallbackData.ContentStudio.trainer`
- **Other Errors**: Falls back to payload data, then mock data

**Mock Fallback Data (Learner-Specific):**
```json
{
  "learner_id": "00000000-0000-0000-0000-000000000001",
  "learner_name": "Demo Learner",
  "learner_company": "Demo Company",
  "topics": [
    {
      "topic_name": "Introduction to Web Development",
      "lessons": [
        {
          "lesson_name": "Getting Started with HTML",
          "lesson_description": "Learn the basics of HTML structure and tags",
          "skills": ["html", "web-development"]
        },
        {
          "lesson_name": "CSS Fundamentals",
          "lesson_description": "Master CSS styling and layout",
          "skills": ["css", "styling"]
        }
      ]
    },
    {
      "topic_name": "JavaScript Basics",
      "lessons": [
        {
          "lesson_name": "Variables and Data Types",
          "skills": ["javascript", "programming"]
        }
      ]
    }
  ]
}
```

### 2. Assessment
**Fallback Strategy:**
- **Network Errors**: Uses mock data from `fallbackData.Assessment`
- **Other Errors**: Falls back to payload data, then mock data

**Mock Fallback Data:**
```json
{
  "learner_id": "00000000-0000-0000-0000-000000000001",
  "course_id": "11111111-1111-1111-1111-111111111111",
  "course_name": "Web Development Fundamentals",
  "exam_type": "postcourse",
  "passing_grade": 70.0,
  "final_grade": 85.5,
  "passed": true,
  "assessment_date": "2025-11-16T21:00:00.000Z"
}
```

### 3. Learner AI
**Fallback Strategy:**
- **Network Errors**: Uses mock data from `fallbackData.LearnerAI`
- **Other Errors**: Falls back to payload data, then mock data

**Mock Fallback Data:**
```json
{
  "user_id": "00000000-0000-0000-0000-000000000001",
  "user_name": "Demo User",
  "company_id": "company-demo-001",
  "company_name": "Demo Tech Corp",
  "skills": ["javascript", "react", "nodejs", "typescript"],
  "competency_name": "Full Stack Developer",
  "skill_level": "intermediate"
}
```

### 4. Directory
**Fallback Strategy:**
- **Network Errors**: Uses mock data from `fallbackData.Directory`
- **Other Errors**: Falls back to payload data, then mock data

**Mock Fallback Data:**
```json
{
  "employee_id": "emp-demo-001",
  "preferred_language": "en-US",
  "bonus_attempt": true,
  "department": "Engineering",
  "role": "Software Developer"
}
```

### 5. Skills Engine
**Fallback Strategy:**
- **Network Errors**: Uses mock data from `fallbackData.SkillsEngine`
- **Other Errors**: Falls back to payload data, then mock data

**Mock Fallback Data:**
```json
{
  "skills": [
    {
      "skill_id": "skill-js-001",
      "skill_name": "JavaScript",
      "category": "programming",
      "level": "intermediate"
    },
    {
      "skill_id": "skill-react-001",
      "skill_name": "React",
      "category": "framework",
      "level": "beginner"
    },
    {
      "skill_id": "skill-node-001",
      "skill_name": "Node.js",
      "category": "backend",
      "level": "intermediate"
    }
  ]
}
```

### 6. Learning Analytics
**Fallback Strategy:**
- Always returns empty response template (doesn't send data back)

**Fallback Response:**
```json
{}
```

### 7. Management Reporting
**Fallback Strategy:**
- Always returns empty response template (doesn't send data back)

**Fallback Response:**
```json
{}
```

### 8. DevLab
**Fallback Strategy:**
- Always returns empty response template (doesn't send data back)

**Fallback Response:**
```json
{}
```

## Benefits

1. **Contract Compliance**: Response contract is always met, even on errors
2. **Graceful Degradation**: System continues to function with fallback data
3. **No Breaking Changes**: Clients always receive valid response structure
4. **Error Visibility**: Errors are logged but don't break the integration flow

## How Fallback Works

1. **Error Detection**: Handlers check if the error is a network/service error using `shouldUseFallback()`
   - Detects: `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNRESET`, HTTP 502, 503, 504

2. **Fallback Selection**:
   - **Network Errors** → Use mock data from `fallbackData.js`
   - **Other Errors** → Try payload data first, then mock data
   - **Last Resort** → Return minimal valid response structure

3. **Response Guarantee**: Response contract is always met, even on complete failure

## Testing Fallback Behavior

To test fallback behavior in Postman:
1. **Simulate Network Error**: Temporarily disable external service URLs
2. **Send Invalid Data**: Send requests with missing required fields
3. **Database Failure**: Temporarily disable database connections

The handlers will:
- Log warnings when using fallback data
- Return valid response structure matching the contract
- Use mock data from `fallbackData.js` for network errors

## Customizing Fallback Data

Edit `backend/integration/fallbackData.js` to customize mock data for each service. The data structure should match the expected response contract for each service.

