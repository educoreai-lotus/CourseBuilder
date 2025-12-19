# Content Studio Request with Real Signature

## Complete Request Example

### HTTP Request

**Method:** `POST`  
**URL:** `https://coordinator-production-6004.up.railway.app/api/fill-content-metrics/`

**Headers:**
```http
Content-Type: application/json
X-Service-Name: course-builder-service
X-Signature: MEQCIEKHyErHmtA0DPJnTpDxNBC+Pc4HYmWsFLBCC2T0uj8IAiARqiE3Bjx2zWP3ORlXaH/sMl0FXDEsF6P77inJu934cA==
```

### Request Body (Envelope)

```json
{
  "requester_service": "course-builder-service",
  "payload": {
    "action": "generate_course_content",
    "description": "Generate course content from learning path",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_name": "Sarah Levy",
    "preferred_language": "en",
    "company_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "company_name": "TechLabs Inc",
    "competency_target_name": "Full-Stack JavaScript Developer",
    "exam_status": "pass",
    "skills_raw_data": ["React Hooks"],
    "learning_path": {
      "path_title": "Mastering React Hooks for Modern Web Development",
      "learner_id": "550e8400-e29b-41d4-a716-446655440001",
      "total_estimated_duration_hours": 12,
      "learning_modules": [
        {
          "module_order": 1,
          "module_title": "Introduction to React Hooks",
          "estimated_duration_hours": 4,
          "skills_in_module": ["React Hooks"],
          "steps": [
            {
              "step": 1,
              "title": "Understanding useState Hook",
              "description": "Learn how to manage component state using the useState hook, including best practices and common patterns.",
              "estimatedTime": 60,
              "skills_covered": ["React Hooks"]
            }
          ]
        }
      ]
    }
  },
  "response": {
    "course": []
  }
}
```

### Signature Details

**Signature:** `MEQCIEKHyErHmtA0DPJnTpDxNBC+Pc4HYmWsFLBCC2T0uj8IAiARqiE3Bjx2zWP3ORlXaH/sMl0FXDEsF6P77inJu934cA==`

**Generation Process:**
1. **Service Name:** `course-builder-service`
2. **Payload Hash:** SHA-256 hash of the entire envelope JSON (stringified, no whitespace)
3. **Message:** `educoreai-course-builder-service-{sha256-hash}`
4. **Algorithm:** ECDSA P-256
5. **Signing:** Signed with Course Builder's private key
6. **Encoding:** Base64-encoded signature

**Note:** This signature is valid for the exact envelope structure shown above. Any change to the payload will require a new signature.

