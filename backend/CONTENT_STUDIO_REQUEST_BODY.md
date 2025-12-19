# Content Studio Request Body

## Request Body Sent to Content Studio

When Course Builder receives a request from Learner AI, it automatically forwards the payload to Content Studio with only `action` and `description` overridden.

### Full Request Envelope (with Signature)

**HTTP Method:** `POST`  
**URL:** `{COORDINATOR_URL}/api/fill-content-metrics/`  
**Headers:**
```http
Content-Type: application/json
X-Service-Name: course-builder-service
X-Signature: {base64-encoded-signature}
```

**Request Body (Envelope):**
```json
{
  "requester_service": "course-builder-service",
  "payload": {
    "action": "generate_course_content",
    "description": "Generate course content from learning path",
    "user_id": "uuid",
    "user_name": "string",
    "preferred_language": "string",
    "company_id": "uuid",
    "company_name": "string",
    "competency_target_name": "string",
    "exam_status": "pass",
    "skills_raw_data": ["skill1", "skill2", "skill3"],
    "learning_path": {
      "path_title": "string",
      "learner_id": "uuid",
      "total_estimated_duration_hours": 0,
      "learning_modules": [
        {
          "module_order": 1,
          "module_title": "string",
          "estimated_duration_hours": 0,
          "skills_in_module": ["skill1", "skill2"],
          "steps": [
            {
              "step": 1,
              "title": "string",
              "description": "string",
              "estimatedTime": 0,
              "skills_covered": ["skill1"]
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

## Signature Details

### Signature Generation

**Algorithm:** ECDSA P-256  
**Format:** Base64-encoded  
**Message Format:** `educoreai-{serviceName}-{payloadHash}`

**Steps:**
1. **Service Name:** `course-builder-service`
2. **Payload Hash:** SHA-256 hash of the entire envelope JSON (stringified)
3. **Message:** `educoreai-course-builder-service-{sha256-hash}`
4. **Sign:** Sign the message with Course Builder's private key using ECDSA P-256
5. **Encode:** Base64-encode the signature
6. **Header:** Add to `X-Signature` header

### Example Signature Calculation

```javascript
// 1. Envelope (the full request body above)
const envelope = {
  requester_service: "course-builder-service",
  payload: { ... },
  response: { course: [] }
};

// 2. Calculate payload hash
const payloadHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(envelope))
  .digest('hex');

// 3. Build message
const message = `educoreai-course-builder-service-${payloadHash}`;

// 4. Sign with private key
const signature = crypto
  .createSign('SHA256')
  .update(message)
  .sign(privateKey, 'base64');

// 5. Add to headers
headers['X-Signature'] = signature;
```

## Key Points

1. **Payload is AS-IS:** All fields from Learner AI are forwarded unchanged
2. **Only Overridden Fields:**
   - `action`: `"push_learning_path"` → `"generate_course_content"`
   - `description`: Original description → `"Generate course content from learning path"`
3. **Envelope Structure:**
   - `requester_service`: Always `"course-builder-service"`
   - `payload`: The Learner AI payload (with action/description overridden)
   - `response`: `{ "course": [] }` (empty template)
4. **Signature:** Generated from the entire envelope, not just the payload

## Comparison: Learner AI → Content Studio

| Field | Learner AI | Content Studio |
|-------|------------|----------------|
| `requester_service` | `"learnerAI"` | `"course-builder-service"` |
| `payload.action` | `"push_learning_path"` | `"generate_course_content"` |
| `payload.description` | Original | `"Generate course content from learning path"` |
| `payload.user_id` | ✅ | ✅ (AS-IS) |
| `payload.user_name` | ✅ | ✅ (AS-IS) |
| `payload.preferred_language` | ✅ | ✅ (AS-IS) |
| `payload.company_id` | ✅ | ✅ (AS-IS) |
| `payload.company_name` | ✅ | ✅ (AS-IS) |
| `payload.competency_target_name` | ✅ | ✅ (AS-IS) |
| `payload.exam_status` | ✅ | ✅ (AS-IS) |
| `payload.skills_raw_data` | ✅ | ✅ (AS-IS) |
| `payload.learning_path` | ✅ | ✅ (AS-IS, untouched) |
| `response` | `{}` | `{ "course": [] }` |

