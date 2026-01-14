# Competition Button – Clean Frontend Implementation Plan

## Single Source of Truth

**Backend API:** `GET /api/v1/courses/:id?learner_id=:learnerId`

**Response Structure:**
```json
{
  "id": "course-id",
  "title": "Course Name",
  ...
  "assessment": {
    "id": "assessment-id",
    "learner_id": "learner-id",
    "course_id": "course-id",
    "exam_type": "postcourse",
    "passing_grade": 70.00,
    "final_grade": 82.50,
    "passed": true
  }
}
```

**If no assessment exists:** `course.assessment` is `null` or `undefined`

**Backend Status:** ✅ Already implemented
- `backend/services/courses.service.js` (lines 294-315) fetches assessment when `learnerId` is provided
- Assessment is included in course response (line 377): `...(assessment && { assessment: assessment })`
- No backend changes needed

---

## Exact Condition for Showing Button

Show the "Competition" button **ONLY** if:
```javascript
course?.assessment?.exam_type === "postcourse" && 
course?.assessment?.passed === true
```

**Otherwise:**
- Do NOT show the button
- Do NOT check URL params
- Do NOT check localStorage
- Do NOT check navigation state
- Do NOT infer or guess

---

## Components to Modify

### 1. FeedbackPage (`frontend/src/pages/FeedbackPage.jsx`)

**Current State:**
- Fetches course via `getCourseById(actualCourseId)` (line 98)
- ❌ **Issue:** Not passing `learner_id` parameter, so assessment is not included
- Has complex detection logic with URL params, navigation state, localStorage (lines 172-242)
- Shows popup based on detected assessment (lines 236-241)

**Required Changes:**
1. **Fix course fetch** to include `learner_id`:
   ```javascript
   const learnerId = userRole === 'learner' ? userProfile?.id : null
   const params = learnerId ? { learner_id: learnerId } : {}
   getCourseById(actualCourseId, params)
   ```

2. **Remove all detection logic** (lines 172-242):
   - Remove URL params checking
   - Remove navigation state checking
   - Remove localStorage checking
   - Remove all console.log statements

3. **Replace with simple check:**
   ```javascript
   useEffect(() => {
     if (!course || pageLoading) return
     
     const shouldShowPopup = 
       course?.assessment?.exam_type === "postcourse" && 
       course?.assessment?.passed === true
     
     setShowPassedPopup(shouldShowPopup)
   }, [course, pageLoading])
   ```

4. **Popup behavior:**
   - Show popup when `showPassedPopup === true`
   - Popup is dismissible (already implemented)
   - Include "Competition" button linking to DevLab URL

---

### 2. CourseOverview (`frontend/src/components/course/CourseOverview.jsx`)

**Current State:**
- Receives `assessmentPassed` as prop (line 118)
- Button already rendered conditionally (lines 349-360)
- ✅ Button implementation is correct

**Required Changes:**
1. **Remove `assessmentPassed` prop** - not needed
2. **Read directly from `course.assessment`:**
   ```javascript
   const shouldShowCompetitionButton = 
     course?.assessment?.exam_type === "postcourse" && 
     course?.assessment?.passed === true
   ```

3. **Update button condition:**
   ```javascript
   {shouldShowCompetitionButton && (
     <a href={DEVLAB_URL} target="_blank" rel="noopener noreferrer" className="...">
       <Trophy size={18} />
       Competition
     </a>
   )}
   ```

---

### 3. CourseDetailsPage (`frontend/src/pages/CourseDetailsPage.jsx`)

**Current State:**
- ✅ Already fetches course with `learner_id` parameter (line 62)
- ✅ Already receives `course.assessment` from backend
- Has complex detection logic (lines 136-198)
- Passes `assessmentPassed` prop to `CourseOverview` (line 503)

**Required Changes:**
1. **Remove all detection logic** (lines 136-198):
   - Remove URL params checking
   - Remove navigation state checking
   - Remove localStorage checking
   - Remove page visibility listener (lines 136-198)
   - Remove localStorage storage (lines 113-122)
   - Remove all console.log statements

2. **Remove `assessmentPassed` prop** from `CourseOverview`:
   - `CourseOverview` will read directly from `course.assessment`

3. **Remove assessment completion detection useEffect** (entire block)

---

## Button Behavior

**DevLab URL:** `https://dev-lab-frontend.vercel.app/`

**On Click:**
- Simple `<a>` tag with `href={DEVLAB_URL}`
- `target="_blank"` (opens in new tab)
- `rel="noopener noreferrer"` (security)

**Do NOT:**
- Call backend
- Re-trigger DevLab
- Update database
- Store any state
- Make any API calls

---

## Summary of Changes

### Files to Modify:

1. **`frontend/src/pages/FeedbackPage.jsx`**
   - Fix course fetch to include `learner_id`
   - Remove all detection logic (URL params, navigation state, localStorage)
   - Replace with simple `course.assessment` check

2. **`frontend/src/components/course/CourseOverview.jsx`**
   - Remove `assessmentPassed` prop
   - Read directly from `course.assessment`
   - Update button condition

3. **`frontend/src/pages/CourseDetailsPage.jsx`**
   - Remove all detection logic
   - Remove localStorage storage
   - Remove page visibility listener
   - Remove `assessmentPassed` prop passing

### Backend:
- ✅ No changes needed - assessment already included in course response

---

## Testing Checklist

After implementation:
- [ ] Button appears when `course.assessment.passed === true` and `exam_type === "postcourse"`
- [ ] Button does NOT appear when `course.assessment` is null
- [ ] Button does NOT appear when `course.assessment.passed === false`
- [ ] Button does NOT appear when `course.assessment.exam_type !== "postcourse"`
- [ ] Popup appears on FeedbackPage when conditions are met
- [ ] Button appears on CourseOverview when conditions are met
- [ ] Clicking button opens DevLab in new tab
- [ ] No console errors
- [ ] No localStorage usage
- [ ] No URL param dependencies

