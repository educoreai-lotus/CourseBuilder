# Competition Button – Frontend-Only Implementation Plan

## 1. Existing Data Source for `passed === true`

### Analysis: Where Assessment Data Might Already Exist

**Finding:** Assessment data is NOT currently visible in existing API responses, but user confirms it's "already available somewhere."

**Possible Sources (to check in implementation):**

#### Option A: URL Query Parameters (Most Likely)
- When Assessment service redirects back to Course Builder Feedback page
- Assessment might pass `passed=true` or `exam_result` in URL query params
- **Check:** `window.location.search` or `useSearchParams()` in FeedbackPage
- **Example:** `/course/:id/feedback?passed=true&exam_type=postcourse`

#### Option B: Navigation State (React Router)
- Assessment might pass data via `navigate()` with `state` prop
- **Check:** `useLocation().state` in FeedbackPage
- **Example:** `navigate('/feedback/:courseId', { state: { passed: true, exam_type: 'postcourse' } })`

#### Option C: Course Response (Hidden Field)
- Backend might already include assessment in course response but not documented
- **Check:** `course.assessment` or `course.learner_progress.assessment` in course data
- **Location:** `getCourseById()` response in FeedbackPage and CourseDetailsPage

#### Option D: localStorage/sessionStorage
- Assessment service might store result before redirect
- **Check:** `localStorage.getItem('assessment_result')` or `sessionStorage`
- **Key:** Might be stored with course_id or learner_id

#### Option E: Context/Global State
- Assessment data might be in AppContext or global state
- **Check:** `useApp()` context for assessment-related state

**Implementation Strategy:**
- Check all sources above in order of likelihood
- Use first available source
- If none found, button simply won't show (graceful degradation)

---

## 2. Components to Modify

### Component 1: Feedback Page (Popup/Modal)
- **File:** `frontend/src/pages/FeedbackPage.jsx`
- **Location:** After page loads (after `pageLoading` becomes `false`)
- **Trigger:** `useEffect` hook that checks for assessment data after page renders
- **Display:** Light popup/modal/success message
- **Message:** "🎉 You passed the assessment!"
- **Button:** "Competition" button
- **Dismissible:** Yes (can be closed, optionally store in localStorage to prevent re-showing)

### Component 2: Course Overview Page (Persistent Button)
- **File:** `frontend/src/components/course/CourseOverview.jsx`
- **Location:** Action area (around lines 340-343, after `secondaryCta`, before Cancel Enrollment button)
- **Display:** Persistent button in course actions sidebar
- **Condition:** Only visible if `passed === true`
- **Data Source:** From `CourseDetailsPage.jsx` (parent component)

---

## 3. How Popup Is Triggered After Feedback Page Render

### Implementation Location
- **File:** `frontend/src/pages/FeedbackPage.jsx`
- **Hook:** Add `useEffect` after line 164 (after existing `bootstrap` useEffect)
- **Logic:**
  1. After `pageLoading === false` and course data loaded
  2. Check for assessment data from all possible sources (URL params, navigation state, course response, localStorage)
  3. If `assessment.passed === true` and `assessment.exam_type === 'postcourse'`
  4. Show popup/modal with success message and "Competition" button
  5. Popup can be dismissed (store in localStorage to prevent re-showing if desired)

### Popup Component Structure
```jsx
{showPassedPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="rounded-2xl bg-[var(--bg-card)] p-6 max-w-md shadow-xl">
      <div className="text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          You passed the assessment!
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Congratulations on completing the course.
        </p>
        <div className="flex gap-3 pt-4">
          <a
            href="https://dev-lab-frontend.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex-1"
          >
            Competition
          </a>
          <button
            onClick={() => setShowPassedPopup(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

### Assessment Data Detection Function
```javascript
const detectAssessmentPassed = () => {
  // Check URL query params
  const urlParams = new URLSearchParams(window.location.search)
  const passedFromUrl = urlParams.get('passed')
  const examTypeFromUrl = urlParams.get('exam_type')
  
  if (passedFromUrl === 'true' && examTypeFromUrl === 'postcourse') {
    return { passed: true, exam_type: 'postcourse' }
  }
  
  // Check navigation state
  const location = useLocation()
  if (location.state?.passed === true && location.state?.exam_type === 'postcourse') {
    return { passed: true, exam_type: 'postcourse' }
  }
  
  // Check course response
  if (course?.assessment?.passed === true && course?.assessment?.exam_type === 'postcourse') {
    return course.assessment
  }
  
  // Check localStorage
  const stored = localStorage.getItem(`assessment_${actualCourseId}_${userProfile?.id}`)
  if (stored) {
    try {
      const assessment = JSON.parse(stored)
      if (assessment.passed === true && assessment.exam_type === 'postcourse') {
        return assessment
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
  
  return null
}
```

---

## 4. How Overview Button Is Rendered

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
- `CourseDetailsPage` detects assessment data from same sources as FeedbackPage

### Data Detection in CourseDetailsPage
```javascript
// In CourseDetailsPage.jsx, after course data loads
const assessmentPassed = useMemo(() => {
  // Check course response first
  if (course?.assessment?.passed === true && course?.assessment?.exam_type === 'postcourse') {
    return true
  }
  
  // Check URL params
  const urlParams = new URLSearchParams(location.search)
  if (urlParams.get('passed') === 'true' && urlParams.get('exam_type') === 'postcourse') {
    return true
  }
  
  // Check navigation state
  if (location.state?.passed === true && location.state?.exam_type === 'postcourse') {
    return true
  }
  
  // Check localStorage
  const stored = localStorage.getItem(`assessment_${id}_${learnerId}`)
  if (stored) {
    try {
      const assessment = JSON.parse(stored)
      return assessment.passed === true && assessment.exam_type === 'postcourse'
    } catch (e) {
      return false
    }
  }
  
  return false
}, [course, location, id, learnerId])
```

---

## 5. Redirect Implementation

### DevLab URL
- **Static URL:** `https://dev-lab-frontend.vercel.app/`
- **Source:** Provided by user (hardcoded constant)
- **No backend response needed**

### Redirect Method
**External Link (Recommended):**
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
- User can return to Course Builder
- No navigation state changes
- Standard web behavior

**Alternative (if needed):**
```jsx
<button
  onClick={() => window.open('https://dev-lab-frontend.vercel.app/', '_blank')}
  className="btn btn-primary"
>
  Competition
</button>
```

---

## 6. Button Visibility Condition

### Exact Condition
```javascript
const showCompetitionButton = assessment && 
                               assessment.exam_type === 'postcourse' && 
                               assessment.passed === true
```

### Safety Checks
- ✅ Assessment data exists (from any source)
- ✅ `exam_type === 'postcourse'`
- ✅ `passed === true`
- ❌ Hide if `passed === false`
- ❌ Hide if `passed === null` or `undefined`
- ❌ Hide if assessment doesn't exist
- ❌ Hide if `exam_type !== 'postcourse'`

---

## 7. Implementation Checklist

### Feedback Page
- [ ] Add state for `showPassedPopup`
- [ ] Add `useEffect` to detect assessment data after page loads
- [ ] Create `detectAssessmentPassed()` helper function
- [ ] Check URL query params (`window.location.search`)
- [ ] Check navigation state (`useLocation().state`)
- [ ] Check course response (`course.assessment`)
- [ ] Check localStorage (if applicable)
- [ ] Create popup/modal component
- [ ] Show popup if `passed === true` and `exam_type === 'postcourse'`
- [ ] Add "Competition" button in popup
- [ ] Implement redirect to DevLab URL (external link)
- [ ] Add dismiss functionality (optional: localStorage to prevent re-showing)

### Course Overview
- [ ] Add `assessmentPassed` prop to `CourseOverview` component
- [ ] Add `useMemo` in `CourseDetailsPage.jsx` to detect assessment
- [ ] Check all data sources (same as FeedbackPage)
- [ ] Pass `assessmentPassed` prop to `CourseOverview`
- [ ] Add "Competition" button in action area
- [ ] Conditionally render based on `assessmentPassed`
- [ ] Implement redirect to DevLab URL (external link)

### Constants
- [ ] Define DevLab URL constant: `const DEVLAB_URL = 'https://dev-lab-frontend.vercel.app/'`

### Testing
- [ ] Test with `passed=true` in URL params
- [ ] Test with `passed=true` in navigation state
- [ ] Test with assessment in course response
- [ ] Test with `passed=false` (button should NOT appear)
- [ ] Test with no assessment data (button should NOT appear)
- [ ] Test popup appears on Feedback page
- [ ] Test button appears on Course Overview
- [ ] Test redirect to DevLab URL works (opens in new tab)

---

## 8. Key Files to Modify

### Frontend Only
1. `frontend/src/pages/FeedbackPage.jsx` - Add popup detection and display
2. `frontend/src/pages/CourseDetailsPage.jsx` - Detect assessment, pass prop
3. `frontend/src/components/course/CourseOverview.jsx` - Add button

### Constants (Optional)
- Create `frontend/src/constants/devlab.js` for DevLab URL constant

---

## 9. Data Detection Priority Order

1. **URL Query Parameters** (highest priority - most likely from redirect)
   - `?passed=true&exam_type=postcourse`
   
2. **Navigation State** (React Router)
   - `location.state.passed` and `location.state.exam_type`
   
3. **Course Response**
   - `course.assessment.passed` and `course.assessment.exam_type`
   
4. **localStorage** (lowest priority - fallback)
   - `localStorage.getItem('assessment_${courseId}_${learnerId}')`

---

## Summary

**Data Source:** Check multiple sources (URL params, navigation state, course response, localStorage) - use first available

**Components:**
1. `FeedbackPage.jsx` - Popup after page loads
2. `CourseOverview.jsx` - Persistent button in action area

**Redirect:** External link to `https://dev-lab-frontend.vercel.app/` (opens in new tab)

**Visibility:** Only if `assessment.passed === true` and `assessment.exam_type === 'postcourse'`

**No Backend Changes:** ✅ Frontend-only implementation, checks existing data sources

**Graceful Degradation:** If no assessment data found, button simply won't appear (no errors)

