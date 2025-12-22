# Competition Button – Implementation Plan

## 1. Data Source for `passed === true`

### Current State: ❌ NO API ENDPOINT EXISTS

**Finding:** Frontend has **NO** way to know if assessment passed.

**Required:** Create backend API endpoint to fetch assessment result.

**Option A (Recommended):** Create dedicated endpoint
- **Endpoint:** `GET /api/v1/courses/:id/assessment/result?learner_id=:learnerId`
- **Controller:** `backend/controllers/assessment.controller.js`
- **Service:** Use `AssessmentRepository.findByLearnerAndCourse(learnerId, courseId)`
- **Response:**
  ```json
  {
    "assessment": {
      "id": "uuid",
      "learner_id": "uuid",
      "course_id": "uuid",
      "exam_type": "postcourse",
      "passing_grade": 70.00,
      "final_grade": 82,
      "passed": true
    }
  }
  ```
- **Returns:** `null` or `404` if no assessment exists

**Option B (Alternative):** Include in course details
- Modify `GET /api/v1/courses/:id` to include assessment when `learner_id` query param provided
- Add `assessment` field to course response
- **Pros:** Single API call
- **Cons:** Adds assessment data to course response (may not always be needed)

**Recommendation:** **Option A** - Dedicated endpoint for cleaner separation

---

## 2. Components to Modify

### Component 1: Feedback Page (Popup/Modal)
- **File:** `frontend/src/pages/FeedbackPage.jsx`
- **Location:** After page loads (after `pageLoading` becomes `false`)
- **Trigger:** `useEffect` hook that checks assessment status after page renders
- **Display:** Light popup/modal/success message
- **Message:** "🎉 You passed the assessment!"
- **Button:** "Competition" button
- **Dismissible:** Yes (can be closed)

### Component 2: Course Overview Page (Persistent Button)
- **File:** `frontend/src/components/course/CourseOverview.jsx`
- **Location:** Action area (around lines 340-343, after `primaryCta`/`secondaryCta`, before Cancel Enrollment button)
- **Display:** Persistent button in course actions sidebar
- **Condition:** Only visible if `passed === true`
- **Styling:** Match existing button styles (`btn btn-primary` or `btn btn-secondary`)

---

## 3. Where Popup Will Be Injected (Feedback Page)

### Implementation Location
- **File:** `frontend/src/pages/FeedbackPage.jsx`
- **Hook:** Add `useEffect` after line 164 (after `bootstrap` useEffect)
- **Logic:**
  1. After `pageLoading === false` and course data loaded
  2. Fetch assessment result using new API endpoint
  3. If `assessment.passed === true` and `assessment.exam_type === 'postcourse'`
  4. Show popup/modal with success message and "Competition" button
  5. Popup can be dismissed (store in localStorage to prevent re-showing)

### Popup Component Structure
```jsx
{showPassedPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="rounded-2xl bg-[var(--bg-card)] p-6 max-w-md">
      <h2>🎉 You passed the assessment!</h2>
      <p>Congratulations on completing the course.</p>
      <button onClick={() => window.location.href = 'https://dev-lab-frontend.vercel.app/'}>
        Competition
      </button>
      <button onClick={() => setShowPassedPopup(false)}>Close</button>
    </div>
  </div>
)}
```

---

## 4. Where Overview Button Will Be Rendered

### Implementation Location
- **File:** `frontend/src/components/course/CourseOverview.jsx`
- **Location:** Lines 340-343 (action area)
- **Insert After:** `secondaryCta` (line 342)
- **Insert Before:** Cancel Enrollment button (line 345)

### Button Code Structure
```jsx
{/* Competition Button - Show if assessment passed */}
{assessmentPassed && (
  <a
    href="https://dev-lab-frontend.vercel.app/"
    target="_blank"
    rel="noopener noreferrer"
    className="btn btn-primary flex items-center justify-center gap-2"
  >
    <Trophy size={18} />
    Competition
  </a>
)}
```

### Props Needed
- Add `assessmentPassed` prop to `CourseOverview` component
- Pass from `CourseDetailsPage.jsx` (parent component)

---

## 5. How Redirect Will Be Done

### DevLab URL
- **Static URL:** `https://dev-lab-frontend.vercel.app/`
- **Source:** Provided by user (static config)
- **No backend response needed**

### Redirect Implementation

**Option A: External Link (Recommended)**
```jsx
<a
  href="https://dev-lab-frontend.vercel.app/"
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-primary"
>
  Competition
</a>
```
- Opens in new tab
- No navigation state changes
- User can return to Course Builder

**Option B: Window Location**
```jsx
<button
  onClick={() => window.location.href = 'https://dev-lab-frontend.vercel.app/'}
  className="btn btn-primary"
>
  Competition
</button>
```
- Navigates in same tab
- User leaves Course Builder

**Recommendation:** **Option A** - External link opens in new tab (better UX)

---

## 6. Data Flow Summary

### Feedback Page Flow
1. `FeedbackPage.jsx` loads
2. After `pageLoading === false`, fetch assessment result
3. If `assessment.passed === true` and `assessment.exam_type === 'postcourse'`
4. Show popup with "Competition" button
5. On click: Redirect to `https://dev-lab-frontend.vercel.app/`

### Course Overview Flow
1. `CourseDetailsPage.jsx` loads course
2. Fetch assessment result (same API call)
3. Pass `assessmentPassed` prop to `CourseOverview`
4. `CourseOverview` conditionally renders "Competition" button
5. On click: Redirect to `https://dev-lab-frontend.vercel.app/`

---

## 7. API Service Function (Frontend)

### New Function in `apiService.js`
```javascript
export function getAssessmentResult(courseId, learnerId) {
  if (!learnerId) {
    return Promise.resolve(null)
  }
  return api.get(`/courses/${courseId}/assessment/result`, {
    params: { learner_id: learnerId }
  }).then(r => r.data?.assessment || null)
    .catch(error => {
      // 404 is expected if no assessment exists
      if (error.response?.status === 404) {
        return null
      }
      console.error('Error fetching assessment result:', error)
      return null
    })
}
```

---

## 8. Backend Endpoint Implementation

### Route
- **File:** `backend/routes/courses.routes.js`
- **Add:** `router.get('/:id/assessment/result', authorizeRoles('learner'), assessmentController.getAssessmentResult)`
- **Position:** After `/:id/assessment/start` route (around line 123)

### Controller
- **File:** `backend/controllers/assessment.controller.js`
- **Function:** `getAssessmentResult`
- **Logic:**
  1. Extract `courseId` from params
  2. Extract `learner_id` from query params
  3. Validate both exist
  4. Call `AssessmentRepository.findByLearnerAndCourse(learnerId, courseId)`
  5. Return assessment or `null` (404)

### Service (if needed)
- Use repository directly in controller (no service layer needed)

---

## 9. Button Visibility Condition

### Exact Condition
```javascript
const showCompetitionButton = assessment && 
                               assessment.exam_type === 'postcourse' && 
                               assessment.passed === true
```

### Safety Checks
- ✅ Assessment exists
- ✅ `exam_type === 'postcourse'`
- ✅ `passed === true`
- ❌ Hide if `passed === false`
- ❌ Hide if `passed === null`
- ❌ Hide if assessment doesn't exist

---

## 10. Implementation Checklist

### Backend
- [ ] Create `GET /api/v1/courses/:id/assessment/result` endpoint
- [ ] Add route in `courses.routes.js`
- [ ] Add controller method in `assessment.controller.js`
- [ ] Use `AssessmentRepository.findByLearnerAndCourse()`
- [ ] Return proper 404 if no assessment exists

### Frontend API Service
- [ ] Add `getAssessmentResult()` function in `apiService.js`
- [ ] Handle 404 gracefully (return `null`)

### Feedback Page
- [ ] Add state for `assessment` and `showPassedPopup`
- [ ] Add `useEffect` to fetch assessment after page loads
- [ ] Create popup/modal component
- [ ] Show popup if `assessment.passed === true`
- [ ] Add "Competition" button in popup
- [ ] Implement redirect to DevLab URL
- [ ] Add dismiss functionality (optional: localStorage to prevent re-showing)

### Course Overview
- [ ] Add `assessmentPassed` prop to `CourseOverview` component
- [ ] Fetch assessment in `CourseDetailsPage.jsx`
- [ ] Pass `assessmentPassed` prop to `CourseOverview`
- [ ] Add "Competition" button in action area
- [ ] Conditionally render based on `assessmentPassed`
- [ ] Implement redirect to DevLab URL

### Testing
- [ ] Test with `passed === true`
- [ ] Test with `passed === false` (button should NOT appear)
- [ ] Test with no assessment (button should NOT appear)
- [ ] Test popup appears on Feedback page
- [ ] Test button appears on Course Overview
- [ ] Test redirect to DevLab URL works

---

## 11. Key Files to Modify

### Backend
1. `backend/routes/courses.routes.js` - Add route
2. `backend/controllers/assessment.controller.js` - Add controller method

### Frontend
1. `frontend/src/services/apiService.js` - Add API function
2. `frontend/src/pages/FeedbackPage.jsx` - Add popup
3. `frontend/src/pages/CourseDetailsPage.jsx` - Fetch assessment, pass prop
4. `frontend/src/components/course/CourseOverview.jsx` - Add button

---

## 12. Constants/Config

### DevLab URL
- **Location:** Can be hardcoded or in config file
- **Value:** `https://dev-lab-frontend.vercel.app/`
- **Recommendation:** Hardcode for now (simple, no config needed)

---

## Summary

**Data Source:** New API endpoint `GET /api/v1/courses/:id/assessment/result`

**Components:**
1. `FeedbackPage.jsx` - Popup after page loads
2. `CourseOverview.jsx` - Persistent button in action area

**Redirect:** External link to `https://dev-lab-frontend.vercel.app/` (opens in new tab)

**Visibility:** Only if `assessment.passed === true` and `assessment.exam_type === 'postcourse'`

**No Backend Changes to Existing Flow:** ✅ Backend DevLab notification remains unchanged

