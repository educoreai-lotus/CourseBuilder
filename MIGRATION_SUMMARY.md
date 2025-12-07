# Migration Summary: Directory → Course Builder → Learner AI → Content Studio Flow

## Overview
Replaced the old Learner AI auto-trigger with the new Directory-driven flow for personalized course generation.

## ✅ Changes Completed

### 1. Removed Old Endpoint
- **Removed**: `POST /api/v1/ai/trigger-personalized-course`
- **Files Updated**:
  - `backend/routes/input.routes.js` - Removed route definition
  - `frontend/src/services/apiService.js` - Removed `triggerPersonalizedCourse()` function

### 2. Created New Directory Trigger Endpoint
- **New Endpoint**: `POST /api/v1/directory/trigger-learning-path`
- **Files Created**:
  - `backend/controllers/directory.controller.js` - New controller handling Directory triggers
- **Files Updated**:
  - `backend/routes/input.routes.js` - Added new route

### 3. Updated Gateway Services
- **Files Updated**:
  - `backend/services/gateways/learnerAIGateway.js` - Now accepts `learner_id` and `tag` (instead of old format)
  - `backend/services/gateways/contentStudioGateway.js` - Added support for `learning_path`, `language`, and `trainerData`

### 4. Updated Integration Handlers
- **Files Updated**:
  - `backend/integration/handlers/learnerAIHandler.js` - Updated comments to clarify it's for backward compatibility (responses, not triggers)

### 5. Frontend Updates
- **Files Updated**:
  - `frontend/src/services/apiService.js` - Removed `triggerPersonalizedCourse()` function and export

### 6. Documentation Updates
- **Files Updated**:
  - `docs/API_Specification.md` - Replaced old endpoint docs with new Directory endpoint
  - `Main_Development_Plan/API_Endpoints_Design.md` - Updated endpoint documentation
  - `Main_Development_Plan/ROADMAP.md` - Updated implementation status

## 📋 New Flow Details

### Flow 1: Learning Path WITHOUT Trainer
```
Directory → Course Builder → Learner AI → Content Studio → Course Builder
```

**Request to Course Builder:**
```json
{
  "learner_id": "uuid",
  "learner_name": "string",
  "learner_company": "string",
  "tag": "competency | learning-path-name | etc",
  "language": "en/he/..."
}
```

**Steps:**
1. Directory sends request to `POST /api/v1/directory/trigger-learning-path`
2. Course Builder calls Learner AI via Coordinator: `{ learner_id, tag }`
3. Learner AI returns: `{ learning_path, skills }`
4. Course Builder calls Content Studio via Coordinator: `{ learner details, learning_path, language }`
5. Content Studio generates course content
6. Course Builder creates course structure and stores in DB
7. Course Builder auto-creates registration for learner
8. Returns course info

### Flow 2: Learning Path WITH Trainer
Same as Flow 1, but includes:
```json
{
  "trainer_id": "uuid",
  "trainer_name": "string"
}
```

Trainer details are passed to Content Studio in the request.

## ✅ Marketplace Courses (Unchanged)
**Flow**: Content Studio → Course Builder

- **Endpoint**: `POST /api/v1/courses/input` (still works)
- **Controller**: `acceptCourseInput` (unchanged)
- **Service**: `generateStructure` (unchanged)
- **Status**: ✅ Fully functional, no changes needed

## 📁 Files Modified

### Backend
1. `backend/routes/input.routes.js` - Removed old route, added new route
2. `backend/controllers/directory.controller.js` - **NEW FILE**
3. `backend/services/gateways/learnerAIGateway.js` - Updated payload format
4. `backend/services/gateways/contentStudioGateway.js` - Added new fields support
5. `backend/integration/handlers/learnerAIHandler.js` - Updated comments

### Frontend
6. `frontend/src/services/apiService.js` - Removed old function

### Documentation
7. `docs/API_Specification.md` - Updated endpoint docs
8. `Main_Development_Plan/API_Endpoints_Design.md` - Updated endpoint docs
9. `Main_Development_Plan/ROADMAP.md` - Updated implementation status

## 🔍 Verification Checklist

- ✅ Old endpoint `POST /api/v1/ai/trigger-personalized-course` removed
- ✅ New endpoint `POST /api/v1/directory/trigger-learning-path` created
- ✅ Frontend references to `triggerPersonalizedCourse` removed
- ✅ Learner AI gateway updated to accept `learner_id` and `tag`
- ✅ Content Studio gateway updated to accept `learning_path`, `language`, `trainerData`
- ✅ Directory controller handles both variants (with/without trainer)
- ✅ All gateway calls use signed envelopes via Coordinator
- ✅ Marketplace courses still work (`POST /api/v1/courses/input`)
- ✅ Documentation updated
- ✅ No direct calls to Learner AI for triggers (only via Coordinator)
- ✅ No old auto-trigger logic remains

## 📝 Postman Examples

### Example 1: Without Trainer
```http
POST /api/v1/directory/trigger-learning-path
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "learner_name": "John Doe",
  "learner_company": "Acme Corp",
  "tag": "competency:react-development",
  "language": "en"
}
```

### Example 2: With Trainer
```http
POST /api/v1/directory/trigger-learning-path
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "learner_name": "John Doe",
  "learner_company": "Acme Corp",
  "tag": "learning-path:full-stack-bootcamp",
  "language": "en",
  "trainer_id": "b9fd1e47-2558-5f0b-a9c2-d0cge3df7d7b",
  "trainer_name": "Jane Trainer"
}
```

### Expected Response
```json
{
  "status": "created",
  "course_id": "07bb1605-6ab3-4cea-8f08-d54c2ac94446",
  "course_name": "Personalized React Development Path",
  "course_type": "learner_specific",
  "learner_id": "a8ec0d36-1447-4e9a-98b1-c9bfd2ce6c6a",
  "created_at": "2025-12-07T14:30:00.000Z"
}
```

## 🎯 Key Points

1. **Personalized courses** are now ONLY triggered by Directory service
2. **Marketplace courses** still use the Content Studio → Course Builder flow (unchanged)
3. **All microservice calls** go through Coordinator with signed envelopes
4. **No direct Learner AI triggers** - Course Builder calls Learner AI, not the other way around
5. **Backward compatibility** - `learnerAIHandler` still exists for responses, but triggers are Directory-driven

## ⚠️ Breaking Changes

- **Removed**: `POST /api/v1/ai/trigger-personalized-course` endpoint
- **Removed**: Frontend `triggerPersonalizedCourse()` function
- **Changed**: Learner AI gateway now requires `learner_id` and `tag` (not `skills` and `competency_name`)

## ✅ Testing Recommendations

1. Test Directory trigger endpoint with both variants (with/without trainer)
2. Verify Learner AI gateway calls work with new payload format
3. Verify Content Studio gateway accepts new fields
4. Test marketplace course creation still works
5. Verify Coordinator envelope signing works correctly
6. Test fallback data mechanisms when services are unavailable

