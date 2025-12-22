# Completion / DevLab Button – Behavior Summary

## 1. Where is the exam result currently handled?

### Backend Handler
- **File:** `backend/integration/handlers/assessmentHandler.js`
- **Function:** `handleExamResult(payloadObject, responseTemplate, requesterService)`
- **Flow:**
  1. Assessment service sends exam result via Coordinator
  2. `assessmentHandler.handleAssessmentIntegration()` routes to `handleExamResult()`
  3. Normalizes `user_id` → `learner_id`
  4. Stores result in `assessments` table
  5. If `passed === true`, triggers DevLab request (fire-and-forget)

### Database Storage
- **Table:** `assessments`
- **Fields stored:**
  - `learner_id` (normalized from `user_id`)
  - `course_id`
  - `exam_type` (default: `'postcourse'`)
  - `passing_grade` (default: `70.00`)
  - `final_grade` (nullable)
  - `passed` (nullable, boolean)
- **Repository:** `AssessmentRepository.findByLearnerAndCourse(learnerId, courseId)`
- **Note:** Returns the most recent assessment (ORDER BY id DESC LIMIT 1)

---

## 2. How does the frontend currently know assessment status?

### Current State: ❌ NO API ENDPOINT EXISTS

**Finding:** There is **NO** API endpoint to fetch assessment results from the frontend.

**Available Endpoints:**
- ✅ `GET /api/v1/courses/:id` - Returns course details (NO assessment data)
- ✅ `GET /api/v1/courses/:id/enrollment-status` - Returns enrollment/progress (NO assessment data)
- ✅ `POST /api/v1/courses/:id/assessment/start` - Starts assessment (doesn't return results)
- ❌ **MISSING:** `GET /api/v1/courses/:id/assessment/result` or similar

**Current Frontend Behavior:**
- Frontend does NOT know if learner passed/failed assessment
- Frontend does NOT know `final_grade`, `passed`, or `exam_type`
- Frontend only tracks lesson completion, not assessment completion

**What Frontend Currently Has:**
- `completedLessons` array (lesson IDs)
- `progress` percentage
- `isEnrolled` status
- **NO assessment status**

---

## 3. Where should the button logic live?

### Current "Take Assessment" Button Location
- **Component:** `frontend/src/components/course/LessonView.jsx`
- **Location:** Footer section (lines 273-299)
- **Condition:** Shown when `onTakeTest` prop is provided
- **Current Usage:**
  - `LessonPage.jsx` passes `onTakeTest={isFinalLesson ? handleTakeTest : undefined}`
  - Only shown on final lesson

### Recommended Button Location
**Option 1: Same Footer (Recommended)**
- **Component:** `frontend/src/components/course/LessonView.jsx`
- **Location:** Footer section, next to or replacing "Take Assessment" button
- **Condition:** Show when assessment passed, hide "Take Assessment" button

**Option 2: Course Overview Page**
- **Component:** `frontend/src/components/course/CourseOverview.jsx`
- **Location:** Progress/completion section
- **Condition:** Show when course completed + assessment passed

**Option 3: Lesson Page (Final Lesson)**
- **Component:** `frontend/src/pages/LessonPage.jsx`
- **Location:** Replace "Take Assessment" button when assessment passed
- **Condition:** Show "Go to DevLab" instead of "Take Assessment"

**Recommendation:** **Option 1** - Same footer in `LessonView.jsx` for consistency

---

## 4. Button visibility condition (VERY IMPORTANT)

### Required Conditions (ALL must be true):
1. ✅ Assessment exists for this learner + course
2. ✅ `exam_type === "postcourse"`
3. ✅ `passed === true`

### Safety Checks (Button must NOT appear if):
- ❌ No assessment record exists
- ❌ `passed === false` or `passed === null`
- ❌ `exam_type !== "postcourse"`
- ❌ Assessment not completed (missing `final_grade` or `passed`)

### Implementation Logic:
```javascript
const showDevLabButton = assessment && 
                         assessment.exam_type === 'postcourse' && 
                         assessment.passed === true
```

---

## 5. Button behavior

### On Click Action
- **Action:** Navigate to DevLab exercises page
- **URL Pattern:** `/course/:courseId/lesson/:lessonId/exercises`
- **Note:** DevLab exercises are per-lesson, not per-course

### DevLab URL/Integration
- **Current Implementation:**
  - DevLab exercises are stored in `lesson.devlab_exercises` array
  - Exercises are rendered in `LessonExercisesPage.jsx` using `DevLabExerciseRenderer`
  - Route: `/course/:id/lesson/:lessonId/exercises`
  - Exercises are HTML content rendered in iframe

- **Backend DevLab Integration:**
  - `devlabGateway.js` sends notification to DevLab service (fire-and-forget)
  - This is a **notification**, not a redirect URL
  - DevLab exercises are already in the lesson content

- **Question:** Which lesson should the button navigate to?
  - Option A: First lesson with DevLab exercises
  - Option B: Final lesson (where assessment was taken)
  - Option C: Course overview with DevLab section

**Recommendation:** Navigate to course overview or first lesson with exercises

---

## 6. Safety checks

### Button Must NOT:
- ❌ Trigger any backend mutation (read-only)
- ❌ Appear if assessment not completed
- ❌ Appear if `passed === false`
- ❌ Appear if `exam_type !== "postcourse"`
- ❌ Appear if assessment record missing

### Button Must:
- ✅ Only navigate (no API calls)
- ✅ Only appear after assessment passed
- ✅ Be disabled/hidden if conditions not met
- ✅ Show appropriate loading state if fetching assessment data

---

## 7. Summary

### Backend Data Required
- **Source:** `assessments` table
- **Query:** `AssessmentRepository.findByLearnerAndCourse(learnerId, courseId)`
- **Fields needed:**
  - `exam_type` (must be `'postcourse'`)
  - `passed` (must be `true`)
  - `final_grade` (optional, for display)

### API Endpoint Needed (NEW)
- **Endpoint:** `GET /api/v1/courses/:id/assessment/result?learner_id=:learnerId`
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
- **Or:** Include assessment in `GET /api/v1/courses/:id` response when `learner_id` query param is provided

### Frontend Component Responsible
- **Primary:** `frontend/src/components/course/LessonView.jsx` (footer section)
- **Alternative:** `frontend/src/pages/LessonPage.jsx` (if replacing "Take Assessment" button)
- **Data Fetching:** Add API call in `LessonPage.jsx` or `CourseDetailsPage.jsx`

### Button Visibility Condition
```javascript
const showDevLabButton = assessment && 
                         assessment.exam_type === 'postcourse' && 
                         assessment.passed === true &&
                         assessment.final_grade !== null // Optional: ensure assessment completed
```

### Button Click Behavior
- **Action:** Navigate to DevLab exercises
- **URL:** `/course/:courseId/lesson/:lessonId/exercises` (first lesson with exercises)
- **OR:** `/course/:courseId/overview` (if DevLab section exists)
- **Implementation:** Use React Router `navigate()` function

### Implementation Steps Required
1. **Backend:** Create API endpoint to fetch assessment result
   - `GET /api/v1/courses/:id/assessment/result?learner_id=:learnerId`
   - Or include in course details response

2. **Frontend:** Fetch assessment data
   - Add API call in `LessonPage.jsx` or `CourseDetailsPage.jsx`
   - Store assessment state

3. **Frontend:** Add button component
   - Add "Go to DevLab" / "Completion / DevLab" button in `LessonView.jsx` footer
   - Conditionally show based on assessment status
   - Hide "Take Assessment" button when assessment passed

4. **Frontend:** Implement navigation
   - Navigate to DevLab exercises page on click
   - Determine which lesson to navigate to (first with exercises or final lesson)

---

## Key Findings

### ✅ What Exists:
- Assessment results are stored in database
- Assessment handler triggers DevLab notification (backend)
- DevLab exercises page exists (`/course/:id/lesson/:lessonId/exercises`)
- "Take Assessment" button exists in footer

### ❌ What's Missing:
- **NO API endpoint to fetch assessment results**
- **NO frontend knowledge of assessment status**
- **NO "Go to DevLab" button after assessment pass**

### 🔧 What Needs to Be Built:
1. **Backend API endpoint** to fetch assessment result
2. **Frontend API service function** to call the endpoint
3. **Frontend state management** for assessment data
4. **Button component** with visibility logic
5. **Navigation logic** to DevLab exercises

---

## Questions to Resolve

1. **Which lesson for DevLab?**
   - Should button navigate to first lesson with exercises?
   - Or final lesson?
   - Or course overview?

2. **Button placement:**
   - Replace "Take Assessment" button?
   - Show alongside it?
   - Show in different location?

3. **Button label:**
   - "Go to DevLab"
   - "Completion / DevLab"
   - "Start Practice Exercises"
   - Other?

4. **API endpoint design:**
   - Separate endpoint: `GET /api/v1/courses/:id/assessment/result`
   - Or include in: `GET /api/v1/courses/:id?learner_id=:learnerId`

---

## Approval Required

**Approve to implement the button? (yes/no)**

**Note:** Implementation will require:
1. Creating backend API endpoint for assessment results
2. Adding frontend API service function
3. Adding button component with conditional rendering
4. Implementing navigation logic

