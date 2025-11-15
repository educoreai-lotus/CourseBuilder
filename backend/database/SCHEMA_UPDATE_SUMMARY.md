# Database Schema Update Summary

**Date**: 2025-01-XX  
**Purpose**: Update schema to reflect final Course Builder hierarchy understanding

---

## ✅ Changes Applied

### 1. Topics Table - Structural Container Clarification

**Modified**: Table comments and column comments  
**Why**: Topics are structural containers ONLY - they do NOT store content

**Changes**:
- Added header comment: `⚠️ CRITICAL: Topics are STRUCTURAL CONTAINERS ONLY`
- Clarified that Topics exist ONLY to maintain hierarchy structure
- Updated `topics.skills` column comment to clarify it's NOT used for storing content
- Added note that skills are ONLY stored at Lesson level

**No structural changes** - table definition unchanged

---

### 2. Modules Table - Structural Container Clarification

**Modified**: Table comments  
**Why**: Modules are structural containers ONLY - they do NOT store content

**Changes**:
- Added header comment: `⚠️ CRITICAL: Modules are STRUCTURAL CONTAINERS ONLY`
- Clarified that Modules exist ONLY to maintain hierarchy structure
- Added note that all real content lives at Lesson level

**No structural changes** - table definition unchanged

---

### 3. Lessons Table - Content Source Clarification & Constraints

**Modified**: Table comments, column defaults, validation constraints  
**Why**: Lessons are the ONLY entity with real content - Content Studio is the ONLY source

**Changes**:
- Added header comment: `⚠️ CRITICAL: Lessons are the ONLY entity that stores real content`
- Updated `content_data` default: `'{}'::jsonb` → `'[]'::jsonb` (array, not object)
- Updated `content_data` to `NOT NULL` with default `'[]'::jsonb`
- Updated `devlab_exercises` to `NOT NULL` with default `'[]'::jsonb`
- Updated `skills` to `NOT NULL` with default `'[]'::jsonb`
- Updated `trainer_ids` to `NOT NULL` with default `'{}'`
- Added CHECK constraints:
  - `lessons_content_data_is_array` - ensures `content_data` is JSONB array
  - `lessons_devlab_exercises_is_array` - ensures `devlab_exercises` is JSONB array
  - `lessons_skills_is_array` - ensures `skills` is JSONB array
- Added column comments clarifying Content Studio is the ONLY source
- Added note about normalizing empty string `""` to `[]` for `devlab_exercises`

**Constraints Added**:
```sql
CONSTRAINT lessons_content_data_is_array CHECK (jsonb_typeof(content_data) = 'array'),
CONSTRAINT lessons_devlab_exercises_is_array CHECK (jsonb_typeof(devlab_exercises) = 'array'),
CONSTRAINT lessons_skills_is_array CHECK (jsonb_typeof(skills) = 'array')
```

---

### 4. Assessments Table - Coverage Map Clarification

**Modified**: Table comments  
**Why**: coverage_map is computed dynamically, NOT stored

**Changes**:
- Added header comment: `⚠️ CRITICAL: coverage_map is NOT stored in DB`
- Clarified that coverage_map is computed dynamically from lessons table
- Noted that it's built by `assessmentDTO.buildSendPayload()` when sending to Assessment microservice
- Added column comment on `passed` field about coverage_map

**No structural changes** - table definition unchanged

---

### 5. Courses Table - Creator Clarification

**Modified**: Column comment  
**Why**: Clarify that created_by_user_id is trainer UUID or learner UUID, NOT "AI UUID"

**Changes**:
- Updated comment: Changed from "trainer or AI UUID" to "trainer UUID (for trainer courses) or learner UUID (for personalized courses)"
- Added column-level comment: "NOT 'AI UUID' - Course Builder never creates content"

**No structural changes** - column definition unchanged

---

### 6. Table-Level Comments Updated

**Modified**: All table COMMENT statements  
**Why**: Reflect final hierarchy understanding

**Changes**:
- **courses**: Added note about Course Builder being a structuring orchestrator
- **topics**: Added `⚠️ STRUCTURAL CONTAINER ONLY` warning and explanation
- **modules**: Added `⚠️ STRUCTURAL CONTAINER ONLY` warning and explanation
- **lessons**: Added `⚠️ LESSONS ARE THE ONLY ENTITY WITH REAL CONTENT` warning
- **assessments**: Clarified coverage_map is computed, not stored
- **feedback**: Clarified course_name is looked up, not stored

---

### 7. Column-Level Comments Added

**New**: Added detailed column comments for clarity

**Added Comments On**:
- `courses.created_by_user_id` - Trainer/learner UUID clarification
- `topics.skills` - NOT used for storing content warning
- `lessons.content_data` - Content Studio is the ONLY source
- `lessons.devlab_exercises` - Content Studio is the ONLY source
- `lessons.skills` - Skills ONLY at Lesson level
- `assessments.passed` - coverage_map computed dynamically

---

## 📋 Constraints Added

### Lessons Table Constraints

1. **`lessons_content_data_is_array`**
   - Type: CHECK constraint
   - Purpose: Ensure `content_data` is always a JSONB array (not object)
   - Validation: `jsonb_typeof(content_data) = 'array'`

2. **`lessons_devlab_exercises_is_array`**
   - Type: CHECK constraint
   - Purpose: Ensure `devlab_exercises` is always a JSONB array
   - Validation: `jsonb_typeof(devlab_exercises) = 'array'`

3. **`lessons_skills_is_array`**
   - Type: CHECK constraint
   - Purpose: Ensure `skills` is always a JSONB array
   - Validation: `jsonb_typeof(skills) = 'array'`

---

## 📝 Comments Updated

### Table Comments

| Table | Previous Comment | Updated Comment |
|-------|------------------|-----------------|
| `courses` | "Main courses table with learning path metadata and dictionaries" | Added: Course Builder is structuring orchestrator; Content Studio is ONLY source |
| `topics` | "Topics within courses, linked to skills" | Changed to: `⚠️ STRUCTURAL CONTAINER ONLY` with full explanation |
| `modules` | "Modules within topics" | Changed to: `⚠️ STRUCTURAL CONTAINER ONLY` with full explanation |
| `lessons` | "Lessons within modules, with Content Studio and DevLab integration" | Changed to: `⚠️ LESSONS ARE THE ONLY ENTITY WITH REAL CONTENT` with full explanation |
| `assessments` | "Assessment results from Assessment microservice" | Added: coverage_map computed dynamically explanation |

### Column Comments (New)

| Table | Column | Comment Added |
|-------|--------|---------------|
| `courses` | `created_by_user_id` | Trainer/learner UUID clarification; NOT "AI UUID" |
| `topics` | `skills` | NOT used for storing content; skills ONLY at Lesson level |
| `lessons` | `content_data` | Content Studio is ONLY source; entire contents[] array |
| `lessons` | `devlab_exercises` | Content Studio is ONLY source; normalize empty string to [] |
| `lessons` | `skills` | Skills ONLY at Lesson level |
| `assessments` | `passed` | coverage_map computed dynamically |

---

## 🔍 No Changes Applied To

As requested, the following were **NOT modified**:

- ✅ Table names
- ✅ Relationships (foreign keys unchanged)
- ✅ ENUM types
- ✅ JSONB dictionaries inside courses (studentsIDDictionary, feedbackDictionary, lesson_completion_dictionary)
- ✅ Registration flow tables (registrations)
- ✅ Version history table (versions)
- ✅ Enrichment logic (no changes)
- ✅ Content Studio mapping fields (structure preserved)

---

## 📊 Schema Summary

### Hierarchy Structure (Confirmed)
```
Course
  ├─ Topics (STRUCTURAL CONTAINERS ONLY, NO CONTENT, NO SKILLS)
  │    └─ Modules (STRUCTURAL CONTAINERS ONLY, NO CONTENT)
  │         └─ Lessons (REAL CONTENT LIVES HERE)
  │              ├─ content_data (from Content Studio)
  │              ├─ devlab_exercises (from Content Studio)
  │              ├─ skills (from Content Studio)
  │              └─ trainer_ids (from Content Studio)
```

### Content Flow (Documented in Comments)
1. **Trainer Course**: Content Studio → Course Builder → DB
2. **Personalized Course**: Learner AI → Course Builder → Content Studio → Course Builder → DB
3. **Course Builder Role**: Structuring orchestrator ONLY - never creates content

---

## ✅ Validation Summary

### Defaults Updated
- `lessons.content_data`: `'[]'::jsonb NOT NULL` ✅
- `lessons.devlab_exercises`: `'[]'::jsonb NOT NULL` ✅
- `lessons.skills`: `'[]'::jsonb NOT NULL` ✅
- `lessons.trainer_ids`: `'{}' NOT NULL` ✅

### Constraints Added
- `lessons_content_data_is_array` ✅
- `lessons_devlab_exercises_is_array` ✅
- `lessons_skills_is_array` ✅

### Comments Updated
- All table comments ✅
- Critical column comments ✅
- Flow documentation in headers ✅

---

## 🎯 Next Steps

After schema updates are applied:

1. **Test schema migration** on development database
2. **Verify constraints** work correctly with existing data
3. **Update DTOs** (next step - not done yet per requirements)
4. **Update services** to enforce Content Studio as only source
5. **Update documentation** if needed

---

## 📝 Notes

- Schema changes are **non-breaking** - existing data should be compatible
- Constraints may need data migration if existing records don't match
- `content_data` changed from object default `'{}'` to array default `'[]'` - verify existing data
- All changes are **documentation and validation** only - no structural table changes

---

## 🔄 Migration Considerations

When applying these changes to existing database:

1. **Check existing `content_data` values**: If any are objects `{}`, need to migrate to arrays `[]`
2. **Check existing `devlab_exercises` values**: If any are empty strings `""`, normalize to `[]`
3. **Verify all `skills` are arrays**: Should already be arrays, but verify
4. **Add constraints gradually**: May need to fix data before adding CHECK constraints
5. **Comments can be added anytime**: No data migration needed for comments

---

## ✅ Compliance Checklist

- ✅ Topics/Modules clarified as structural containers only
- ✅ Lessons confirmed as ONLY entity with content
- ✅ Content Studio documented as ONLY source
- ✅ coverage_map confirmed as computed, not stored
- ✅ Validation constraints added for Content Studio input
- ✅ Foreign keys remain unchanged (lightweight Topics/Modules)
- ✅ No table names changed
- ✅ No relationships changed
- ✅ No ENUMs changed
- ✅ JSONB dictionaries unchanged
- ✅ Registration flow unchanged
- ✅ Version history unchanged

---

**Schema updated to reflect final Course Builder hierarchy understanding.**

