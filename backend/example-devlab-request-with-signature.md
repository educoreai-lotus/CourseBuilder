# DevLab Request Example with Signature

## Request Envelope

```json
{
  "requester_service": "course-builder-service",
  "payload": {
    "course_id": "550e8400-e29b-41d4-a716-446655440000",
    "learner_id": "210dc7a7-9808-445c-8eb7-51c217e3919c",
    "learner_name": "John Doe",
    "course_name": "Node.js Backend Development",
    "action": "notify_learner_course_completion",
    "description": "Notify that a learner has successfully completed a course and passed the final assessment, enabling access to development environment for hands-on coding practice and project work"
  },
  "response": {
    "answer": ""
  }
}
```

## HTTP Request Headers

```
Content-Type: application/json
X-Service-Name: course-builder-service
X-Signature: MEYCIQDQBx82r950DTBl3T5lZ6J0/ncU3uZdLpooQa144UwiWwIhANTYghHKsBk3V67wqXF1+L3aea5Out0CaoyZknE423gH
```

## Complete cURL Example

```bash
curl -X POST https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/ \
  -H "Content-Type: application/json" \
  -H "X-Service-Name: course-builder-service" \
  -H "X-Signature: MEYCIQDQBx82r950DTBl3T5lZ6J0/ncU3uZdLpooQa144UwiWwIhANTYghHKsBk3V67wqXF1+L3aea5Out0CaoyZknE423gH" \
  -d '{
    "requester_service": "course-builder-service",
    "payload": {
      "course_id": "550e8400-e29b-41d4-a716-446655440000",
      "learner_id": "210dc7a7-9808-445c-8eb7-51c217e3919c",
      "learner_name": "John Doe",
      "course_name": "Node.js Backend Development",
      "action": "notify_learner_course_completion",
      "description": "Notify that a learner has successfully completed a course and passed the final assessment, enabling access to development environment for hands-on coding practice and project work"
    },
    "response": {
      "answer": ""
    }
  }'
```

## Request Details

### Action
- **Value**: `notify_learner_course_completion`
- **Purpose**: Identifies the action to be performed by the target service

### Description
- **Value**: `"Notify that a learner has successfully completed a course and passed the final assessment, enabling access to development environment for hands-on coding practice and project work"`
- **Purpose**: Provides detailed context about what this request accomplishes

### Payload Fields
- **course_id**: UUID of the completed course
- **learner_id**: UUID of the learner who completed the course
- **learner_name**: Name of the learner who completed the course
- **course_name**: Human-readable name of the course

### Signature
- **Algorithm**: ECDSA P-256
- **Format**: Base64-encoded
- **Message**: `educoreai-course-builder-service-{payloadHash}`
- **Note**: Signature is generated from the entire envelope payload

## Notes

- This is a **fire-and-forget** request (response is empty)
- The Coordinator will route this to the appropriate service based on the `action` field
- The signature ensures the request is authenticated and tamper-proof

