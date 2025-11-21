# Postman Example: Content Studio Integration

## Quick Test Example

### Request Configuration

**Method**: `POST`  
**URL**: `http://localhost:3000/api/fill-content-metrics`  
**Headers**:
```
Content-Type: application/json
```

### Request Body (Learner Course Request)

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "lnr_76291",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"]
  },
  "response": {
    "course": []
  }
}
```

### Expected Response

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "lnr_76291",
    "learner_name": "Sarah Levy",
    "learner_company": "TechLabs",
    "skills": ["react", "hooks", "typescript"]
  },
  "response": {
    "course": [
      {
        "course_id": "d0e1f2a3-b4c5-6789-ef01-890123456789",
        "course_name": "Advanced React Development",
        "course_description": "Master advanced React concepts...",
        // ... full course content
      }
    ]
  }
}
```

---

## Minimal Example

```json
{
  "requester_service": "course_builder",
  "payload": {
    "learner_id": "lnr_76291",
    "skills": ["react"]
  },
  "response": {
    "course": []
  }
}
```

---

## Steps to Test in Postman

1. **Open Postman**
2. **Create new request**: POST
3. **Set URL**: `http://localhost:3000/api/fill-content-metrics`
4. **Add Headers**: 
   - Key: `Content-Type`
   - Value: `application/json`
5. **Go to Body tab** → Select **raw** → Select **JSON**
6. **Paste the request body** (one of the examples above)
7. **Click Send**

---

## Notes

- `requester_service`: Use lowercase with underscores (`"course_builder"`)
- `payload`: Regular JSON object (NOT stringified)
- `response`: Regular JSON object (NOT stringified)
- Empty `response.course: []` will be filled by the handler

