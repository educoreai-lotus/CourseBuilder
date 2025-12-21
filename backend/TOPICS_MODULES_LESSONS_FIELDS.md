# Important Fields: Topics, Modules, and Lessons Tables

## 📚 TOPICS TABLE

**Purpose:** Structural container for organizing course content. Topics are **NOT** content storage - they only provide hierarchy and navigation.

### Important Fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (PK) | Primary key - unique identifier for the topic |
| `course_id` | UUID (FK) | Foreign key to `courses.id` - identifies which course this topic belongs to. **Required.** |
| `topic_name` | TEXT | Display name of the topic (e.g., "React Fundamentals", "Node.js Backend"). **Required.** |
| `topic_description` | TEXT | Optional description/overview of what the topic covers |

### Key Notes:
- ⚠️ **Topics are STRUCTURAL ONLY** - they do NOT store content, skills, or educational material
- Skills are stored at the **Lesson level only** (`lessons.skills`)
- If topic-level skills are needed, they are computed dynamically by aggregating from lessons
- Topics provide grouping and navigation in the UI
- One course can have multiple topics
- Topics are deleted when their parent course is deleted (ON DELETE CASCADE)

---

## 📦 MODULES TABLE

**Purpose:** Structural container nested within topics. Modules are **NOT** content storage - they only provide hierarchy and navigation.

### Important Fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (PK) | Primary key - unique identifier for the module |
| `topic_id` | UUID (FK) | Foreign key to `topics.id` - identifies which topic this module belongs to. **Required.** |
| `module_name` | TEXT | Display name of the module (e.g., "React Hooks", "State Management"). **Required.** |
| `module_description` | TEXT | Optional description/overview of what the module covers |

### Key Notes:
- ⚠️ **Modules are STRUCTURAL ONLY** - they do NOT store content, skills, or educational material
- All real content lives at the **Lesson level**
- Modules provide grouping and navigation in the UI
- One topic can have multiple modules
- Modules are deleted when their parent topic is deleted (ON DELETE CASCADE)

---

## 📖 LESSONS TABLE

**Purpose:** **THE ONLY entity that stores actual learning content.** All educational material, skills, and exercises are stored here.

### Important Fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (PK) | Primary key - unique identifier for the lesson |
| `module_id` | UUID (FK) | Foreign key to `modules.id` - identifies which module this lesson belongs to. **Required.** |
| `topic_id` | UUID (FK) | Foreign key to `topics.id` - identifies which topic this lesson belongs to. **Required.** |
| `lesson_name` | TEXT | Display name of the lesson (e.g., "Introduction to React Hooks", "useState Hook"). **Required.** |
| `lesson_description` | TEXT | Optional description/overview of what the lesson covers |
| `skills` | JSONB (Array) | **Skills covered in this lesson** - array of skill strings (e.g., `["React Hooks", "State Management"]`). **This is the ONLY place skills are stored.** Default: `[]` |
| `trainer_ids` | UUID[] (Array) | Array of trainer UUIDs who contributed to this lesson content. Default: `[]` |
| `content_type` | TEXT | Type of content: `'video'`, `'article'`, `'exercise'`, `'mixed'`, etc. |
| `content_data` | JSONB (Array) | **Raw content from Content Studio** - entire `contents[]` array stored as single JSONB array. Contains all content blocks: `text_audio`, `code`, `presentation`, `audio`, `mind_map`, `avatar_video`. **Content Studio is the ONLY source.** Default: `[]` |
| `devlab_exercises` | JSONB (Array) | **DevLab exercises from Content Studio** - array of HTML exercise documents. Each element is a complete HTML document with embedded JavaScript for code execution. If Content Studio sends empty string `""`, it's normalized to empty array `[]`. Default: `[]` |
| `format_order` | JSONB (Array) | Display order of content formats within a lesson (e.g., `["video", "hands-on", "reading"]`). Used by frontend to determine rendering order. Default: `[]` |

### Key Notes:
- ⚠️ **Lessons are THE ONLY entity with real content**
- All actual learning content lives here: `content_data`, `devlab_exercises`, `skills`, `trainer_ids`
- **Content Studio is the ONLY source** of lesson content (`content_data`, `devlab_exercises`)
- Course Builder **NEVER creates lesson content** - it only structures content from Content Studio
- One Content Studio topic = one Course Builder lesson
- Content Studio `contents[]` array → stored in `lesson.content_data` (entire array as JSONB)
- Skills are **ONLY stored at the Lesson level** - Topics and Modules do NOT store skills
- Lessons are deleted when their parent module is deleted (ON DELETE CASCADE)
- Lessons are also deleted when their parent topic is deleted (ON DELETE CASCADE)

---

## 🔗 Relationships Summary

```
Course (1) → (N) Topics
Topic (1) → (N) Modules  
Module (1) → (N) Lessons
```

**Hierarchy:** `Course → Topic → Module → Lesson`

**Content Storage:**
- ❌ Course: No content (metadata only)
- ❌ Topic: No content (structural only)
- ❌ Module: No content (structural only)
- ✅ Lesson: **ALL content stored here**

---

## 📊 Coverage Map Generation

When building coverage maps for Assessment service:
- Source: `lessons` table
- Extract: `lesson.id` → `lesson.skills`
- Format: `[{ lesson_id: UUID, skills: ["skill1", "skill2", ...] }]`
- Function: `assessmentDTO.buildCoverageMapFromLessons(lessons)`

---

## 🎯 Common Queries

### Get all lessons for a course:
```sql
SELECT l.* 
FROM lessons l
JOIN modules m ON l.module_id = m.id
JOIN topics t ON m.topic_id = t.id
WHERE t.course_id = $1
```

### Get all skills for a course (aggregated from lessons):
```sql
SELECT DISTINCT skill
FROM lessons l
JOIN modules m ON l.module_id = m.id
JOIN topics t ON m.topic_id = t.id
CROSS JOIN LATERAL jsonb_array_elements_text(l.skills) AS skill
WHERE t.course_id = $1
```

### Get topic structure with lesson count:
```sql
SELECT 
  t.id,
  t.topic_name,
  COUNT(DISTINCT m.id) as module_count,
  COUNT(DISTINCT l.id) as lesson_count
FROM topics t
LEFT JOIN modules m ON m.topic_id = t.id
LEFT JOIN lessons l ON l.topic_id = t.id
WHERE t.course_id = $1
GROUP BY t.id, t.topic_name
```

