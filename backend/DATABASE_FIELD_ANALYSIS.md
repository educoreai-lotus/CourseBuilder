# Database Field Analysis - Course Builder

## Summary: Fields That Don't Belong or Are Missing

### 🔴 **CRITICAL: Unused/Unnecessary Fields**

#### 1. **`exercises` Table - COMPLETELY UNUSED**
   - **Status**: ❌ **SHOULD BE REMOVED**
   - **Reason**: 
     - No `ExerciseRepository.js` file exists
     - No usage in services or repositories
     - Exercises come from Content Studio as `lessons.devlab_exercises` (JSONB array)
     - Only referenced in tests for foreign key validation
   - **Evidence**: 
     - Schema defines `exercises` table (lines 188-196)
     - No repository file for it
     - All exercise data stored in `lessons.devlab_exercises`
   - **Recommendation**: **DELETE the `exercises` table entirely**

#### 2. **`assessments.passing_grade` - NOT YOUR RESPONSIBILITY**
   - **Status**: ⚠️ **SHOULD BE REMOVED**
   - **Reason**: 
     - Assessment service defines passing grades, not Course Builder
     - Course Builder only stores RESULTS from Assessment service
     - This field assumes Course Builder knows assessment configuration
   - **Evidence**: 
     - Line 212: `passing_grade NUMERIC(5,2) DEFAULT 70.00`
     - Used in AssessmentRepository but not your responsibility
   - **Recommendation**: **REMOVE `passing_grade` from assessments table**

#### 3. **`assessments.learner_name` - NOT YOUR DATA**
   - **Status**: ⚠️ **SHOULD BE REMOVED**
   - **Reason**: 
     - Learner data should come from Directory/User service
     - Course Builder shouldn't store learner names (GDPR concern)
     - Only need `learner_id` to look up from Directory service
   - **Evidence**: 
     - Line 209: `learner_name TEXT`
     - Stored but can be fetched from Directory when needed
   - **Recommendation**: **REMOVE `learner_name` from assessments table**

#### 4. **`assessments.exam_type` - REDUNDANT**
   - **Status**: ⚠️ **CONSIDER REMOVING**
   - **Reason**: 
     - Only has one value: `'postcourse'` (default)
     - If there's only one exam type, why store it?
     - If multiple types are needed, Assessment service should track this
   - **Evidence**: 
     - Line 211: `exam_type exam_type NOT NULL DEFAULT 'postcourse'`
     - Enum only has one value: `exam_type AS ENUM ('postcourse')`
   - **Recommendation**: **REMOVE `exam_type` unless multiple types are truly needed**

#### 5. **`topics.skills` - DOCUMENTED AS UNUSED**
   - **Status**: ⚠️ **SHOULD BE REMOVED**
   - **Reason**: 
     - Documented as "NOT USED FOR STORING CONTENT"
     - Skills only stored at Lesson level
     - Creates confusion and potential data inconsistency
   - **Evidence**: 
     - Line 124: `skills JSONB DEFAULT '[]'::jsonb`
     - Comment says: "⚠️ NOT USED FOR STORING CONTENT"
     - If topic-level skills needed, computed from lessons
   - **Recommendation**: **REMOVE `topics.skills` field entirely**

### 🟡 **Missing Fields That Should Be Added**

#### 1. **`assessments.created_at` or `assessments.assessed_at` - MISSING**
   - **Status**: ⚠️ **SHOULD BE ADDED**
   - **Reason**: 
     - Need to know WHEN assessment was taken
     - Important for tracking and analytics
     - Other tables have timestamps (feedback, registrations)
   - **Recommendation**: **ADD `assessed_at TIMESTAMP DEFAULT now()`**

#### 2. **`assessments.assessment_id` - MISSING (from Assessment service)**
   - **Status**: ⚠️ **SHOULD BE ADDED**
   - **Reason**: 
     - Need to reference back to Assessment service's assessment record
     - For linking/querying assessment details
     - Audit trail back to source system
   - **Recommendation**: **ADD `external_assessment_id UUID` (optional, for linking)**

#### 3. **`registrations.progress` - STORED IN JSONB, SHOULD BE COLUMN**
   - **Status**: ⚠️ **CONSIDER ADDING**
   - **Reason**: 
     - Progress currently in `courses.lesson_completion_dictionary` (JSONB)
     - Hard to query/aggregate from JSONB
     - Would be easier with a dedicated column
   - **Current**: Progress calculated from `lesson_completion_dictionary`
   - **Recommendation**: **ADD `progress NUMERIC(5,2) DEFAULT 0` OR keep as-is if JSONB works**

### 🟢 **Fields That Are Correctly Your Responsibility**

#### ✅ **Correctly Stored:**
- `courses.*` - Course structure and metadata ✅
- `topics.*` (except skills) - Structural grouping ✅
- `modules.*` - Structural grouping ✅
- `lessons.*` - Lesson content FROM Content Studio ✅
  - `lessons.content_data` - From Content Studio ✅
  - `lessons.devlab_exercises` - From Content Studio ✅
  - `lessons.skills` - From Content Studio ✅
- `registrations.*` - Learner enrollment tracking ✅
- `feedback.*` - Learner feedback ✅
- `versions.*` - Course version history ✅
- `assessments.final_grade` - Assessment result ✅
- `assessments.passed` - Assessment result ✅

### 📋 **Recommendations Summary**

#### **High Priority - Remove:**
1. ❌ **DELETE `exercises` table** (completely unused)
2. ❌ **REMOVE `topics.skills` field** (documented as unused)
3. ❌ **REMOVE `assessments.passing_grade`** (Assessment service's responsibility)
4. ❌ **REMOVE `assessments.learner_name`** (Directory service's responsibility)

#### **Medium Priority - Remove/Consider:**
5. ⚠️ **REMOVE `assessments.exam_type`** (only one value, redundant)

#### **Medium Priority - Add:**
6. ⚠️ **ADD `assessments.assessed_at TIMESTAMP`** (when assessment taken)
7. ⚠️ **ADD `assessments.external_assessment_id UUID`** (link to Assessment service)

#### **Low Priority - Consider:**
8. 💡 **CONSIDER `registrations.progress` column** (instead of JSONB calculation)

### 🔍 **Field-by-Field Breakdown**

| Table | Field | Status | Action | Reason |
|-------|-------|--------|--------|--------|
| `exercises` | Entire table | ❌ REMOVE | DELETE | Not used, exercises in `lessons.devlab_exercises` |
| `topics` | `skills` | ❌ REMOVE | DROP COLUMN | Documented as unused, skills at lesson level |
| `assessments` | `passing_grade` | ❌ REMOVE | DROP COLUMN | Assessment service defines this |
| `assessments` | `learner_name` | ❌ REMOVE | DROP COLUMN | Directory service has this data |
| `assessments` | `exam_type` | ⚠️ REMOVE | DROP COLUMN | Only one value ('postcourse') |
| `assessments` | `assessed_at` | ⚠️ ADD | ADD COLUMN | Missing timestamp |
| `assessments` | `external_assessment_id` | ⚠️ ADD | ADD COLUMN | Link to Assessment service |

---

**Last Updated**: 2025-11-15

