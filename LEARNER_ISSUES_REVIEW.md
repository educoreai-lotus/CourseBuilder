# Learner Functionality Issues Review

## 🔴 Critical Issues

### 1. **LearnerDashboard Shows FAKE Data**
**Location:** `frontend/src/pages/LearnerDashboard.jsx`

**Problem:**
```javascript
// Lines 27-33: FAKE progress data
setContinueLearning(
  courses.slice(6, 12).map((course, idx) => ({
    ...course,
    progress: 20 + ((idx * 17) % 60),  // ❌ FAKE progress calculation
    lastTouched: `${2 + idx} days ago`  // ❌ FAKE last touched date
  }))
)

// Lines 34-40: FAKE trending topics
setTrendingTopics(
  courses.slice(12, 18).map((course, idx) => ({
    topic: course.category || `Topic ${idx + 1}`,
    learners: 320 + idx * 57,  // ❌ FAKE learner counts
    momentum: idx % 2 === 0 ? 'up' : 'steady'
  }))
)
```

**Impact:** 
- Dashboard doesn't show real enrolled courses
- Progress percentages are fake
- "Continue learning" section shows random courses, not actual enrolled courses
- Metrics (enrolled count, completed count) are incorrect

**Fix Needed:**
- Call `getLearnerProgress(learnerId)` API to get real enrolled courses
- Filter courses to show only enrolled ones in "Continue learning"
- Use real progress data from API
- Calculate real metrics from actual data

---

### 2. **Registration Missing learner_name Parameter**
**Location:** 
- `backend/services/courses.service.js` (line 290)
- `frontend/src/pages/CourseDetailsPage.jsx` (line 105-108)

**Problem:**
```javascript
// Backend expects learner_name but hardcodes it:
await db.none(
  `INSERT INTO registrations (..., learner_name, ...)
   VALUES ($1, $2, $3, $4, ...)`,
  [registrationId, courseId, learner_id, 'Learner', ...]  // ❌ Hardcoded 'Learner'
);

// Frontend passes learner_name but backend ignores it:
await registerLearner(id, {
  learner_id: learnerId,
  learner_name: userProfile?.name,  // ✅ Passed but not used
  learner_company: userProfile?.company
})
```

**Impact:** All registrations show "Learner" as name instead of actual learner name.

**Fix Needed:**
- Update `registerLearner` service to accept and use `learner_name` parameter
- Update controller to pass `learner_name` from request body

---

## 🟡 Medium Issues

### 3. **LearnerLibrary Missing Course Details**
**Location:** `frontend/src/pages/LearnerLibrary.jsx` (line 160-167)

**Problem:**
```javascript
const enhancedCourses = progressData.map(course => ({
  id: course.course_id,
  title: course.title,
  level: course.level,
  rating: course.rating,
  progress: course.progress,
  status: course.status
  // ❌ Missing: description, modules, lessons_total, etc.
}))
```

**Impact:** Library cards might be missing important course information.

**Fix Needed:** Include more course details from the API response.

---

### 4. **Error Handling in Enrollment**
**Location:** `frontend/src/pages/CourseDetailsPage.jsx` (line 120-136)

**Current:**
```javascript
catch (err) {
  if (err.response?.status === 409) {
    // Handles duplicate enrollment
  } else {
    const errorMsg = err.response?.data?.message || err.message || 'Registration failed'
    // ✅ Good error handling
  }
}
```

**Status:** ✅ Already has good error handling

---

## ✅ Working Operations

### Enrollment
- ✅ `POST /api/v1/courses/:id/register` - Saves to DB correctly
- ✅ Duplicate enrollment detection (409 error)
- ✅ Course enrollment count updates

### Progress Tracking
- ✅ `PATCH /api/v1/courses/:id/progress` - Saves lesson completion to DB
- ✅ Progress percentage calculation
- ✅ Status updates (in_progress → completed)

### Library
- ✅ `GET /api/v1/courses/learners/:learnerId/progress` - Retrieves enrolled courses
- ✅ Filters (all, in_progress, completed) work

---

## 📋 Recommended Fixes Priority

1. **HIGH:** Fix LearnerDashboard to use real data from `getLearnerProgress` API
2. **HIGH:** Fix registration to use actual `learner_name` instead of hardcoded 'Learner'
3. **MEDIUM:** Enhance LearnerLibrary to show more course details
4. **LOW:** Add loading states and error handling improvements

---

## 🔍 Testing Checklist

To verify learner operations work:

- [ ] Enroll in a course → Check DB registration table
- [ ] Complete a lesson → Check DB lesson_progress table
- [ ] View dashboard → **Currently shows fake data** → Should show real enrolled courses
- [ ] View library → Check if enrolled courses appear
- [ ] Check progress percentage → Should match completed lessons
- [ ] Registration name → **Currently shows "Learner"** → Should show actual name

---

## 📝 Next Steps

1. Update LearnerDashboard to call `getLearnerProgress` API
2. Filter courses to show only enrolled ones
3. Use real progress data instead of fake calculations
4. Fix registration to use actual learner_name
5. Test all learner flows end-to-end

