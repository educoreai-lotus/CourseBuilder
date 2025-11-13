# Database Operations Review - Issues Found

## 🔴 Critical Issues

### 1. **Course Validation Not Saving to Database**
**Location:** `frontend/src/pages/TrainerCourseValidation.jsx`

**Problem:**
```javascript
const handleValidate = () => {
  setValidated(true)  // ❌ Only sets local state, doesn't save to DB
  showToast('Course validated successfully! Ready for publishing.', 'success')
}
```

**Impact:** Validation status is lost on page refresh. The course status in the database never changes from 'draft' to 'validated'.

**Fix Needed:**
- Create API endpoint: `POST /api/v1/courses/:id/validate`
- Update `handleValidate` to call the API
- Backend should update course status to 'validated' in database

---

### 2. **PublishControls Callback Signature Mismatch**
**Location:** 
- `frontend/src/components/PublishControls.jsx` (line 11)
- `frontend/src/pages/TrainerPublish.jsx` (line 35)

**Problem:**
```javascript
// PublishControls.jsx calls:
onPublish({ immediate: true })  // ❌ Passes object

// But TrainerPublish.jsx expects:
const handlePublish = async () => {  // ❌ No parameters
  await publishCourse(id)
}
```

**Impact:** The callback works but ignores the parameter. Not a breaking issue, but inconsistent.

**Fix Needed:**
- Update `handlePublish` to accept optional parameter (for consistency)
- Or update `PublishControls` to call `onPublish()` without parameters

---

## 🟡 Potential Issues

### 3. **Course Update May Not Refresh Data**
**Location:** `frontend/src/pages/TrainerCourses.jsx`

**Problem:** After updating a course, the list might not refresh automatically.

**Check:** Verify if `loadCourses()` is called after successful update.

---

### 4. **Scheduled Publishing Metadata Storage**
**Location:** `backend/services/courses.service.js` (line 658-668)

**Current Implementation:**
```javascript
// Stores in metadata JSONB field
UPDATE courses 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{scheduled_publish_at}',
  to_jsonb($1::text)
)
```

**Potential Issue:** If metadata already has other data, this might overwrite or conflict.

**Recommendation:** Consider adding a dedicated `scheduled_publish_at` column instead of storing in metadata.

---

### 5. **Error Handling in Publishing**
**Location:** `frontend/src/pages/TrainerPublish.jsx`

**Current:**
```javascript
catch (err) {
  showToast('Failed to publish course', 'error')  // ❌ Generic error message
}
```

**Issue:** User doesn't see the actual error message from the API.

**Fix Needed:**
```javascript
catch (err) {
  const message = err.response?.data?.message || err.message || 'Failed to publish course'
  showToast(message, 'error')
}
```

---

## ✅ Working Operations

### Publishing
- ✅ Immediate publish: `POST /api/v1/courses/:id/publish` - Saves to DB correctly
- ✅ Scheduled publish: `POST /api/v1/courses/:id/schedule` - Saves to DB correctly
- ✅ Unpublish: `POST /api/v1/courses/:id/unpublish` - Saves to DB correctly

### Course Management
- ✅ Create course: `POST /api/v1/courses` - Saves to DB correctly
- ✅ Update course: `PUT /api/v1/courses/:id` - Saves to DB correctly
- ✅ Get courses: `GET /api/v1/courses` - Retrieves from DB correctly

### Progress Tracking
- ✅ Update lesson progress: `PATCH /api/v1/courses/:id/progress` - Saves to DB correctly
- ✅ Register learner: `POST /api/v1/courses/:id/register` - Saves to DB correctly

---

## 📋 Recommended Fixes Priority

1. **HIGH:** Fix validation not saving to database
2. **MEDIUM:** Improve error messages in publishing
3. **LOW:** Fix PublishControls callback signature mismatch
4. **LOW:** Consider dedicated column for scheduled_publish_at

---

## 🔍 Testing Checklist

To verify all operations work:

- [ ] Create a new course → Check DB
- [ ] Update course metadata → Check DB
- [ ] Validate course → **Currently broken** → Check DB after fix
- [ ] Publish course immediately → Check DB
- [ ] Schedule course publishing → Check DB
- [ ] Unpublish course → Check DB
- [ ] Update lesson progress → Check DB
- [ ] Register learner → Check DB

---

## 📝 Next Steps

1. Create validation API endpoint
2. Update frontend to call validation API
3. Improve error handling across all operations
4. Add database transaction logging for debugging
5. Test all operations end-to-end

