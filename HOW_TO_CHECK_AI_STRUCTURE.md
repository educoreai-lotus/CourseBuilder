# How to Check if Topics and Modules Were Chosen by AI

When a course is created, the system uses AI to generate the topic and module structure. Here's how to verify if AI was used and what it generated.

---

## 🔍 Where AI Structure Information is Stored

The AI structure metadata is stored in the `learning_path_designation` JSONB field in the `courses` table. This field contains:

```json
{
  "total_lessons": 15,
  "total_topics": 4,
  "total_modules": 8,
  "generated_at": "2025-12-02T10:30:00.000Z",
  "enrichment_provider": "openai-assets",
  "structure_source": "ai-generated",  // or "fallback"
  "structure_generated_by": "ai"      // Indicates AI was used
}
```

---

## ✅ Method 1: Check Database Directly (SQL)

### Check if AI was used for a specific course:

```sql
SELECT 
  id,
  course_name,
  learning_path_designation->>'structure_source' as structure_source,
  learning_path_designation->>'structure_generated_by' as generated_by,
  learning_path_designation->>'total_topics' as topics_count,
  learning_path_designation->>'total_modules' as modules_count,
  learning_path_designation->>'total_lessons' as lessons_count,
  learning_path_designation->>'generated_at' as generated_at
FROM courses
WHERE id = 'YOUR_COURSE_ID';
```

### Check all courses and their AI status:

```sql
SELECT 
  course_name,
  course_type,
  learning_path_designation->>'structure_source' as ai_source,
  learning_path_designation->>'structure_generated_by' as ai_generated,
  learning_path_designation->>'total_topics' as topics,
  learning_path_designation->>'total_modules' as modules
FROM courses
ORDER BY created_at DESC;
```

### Expected Results:

- **`structure_source: "ai-generated"`** = AI successfully generated structure
- **`structure_source: "fallback"`** = AI failed, used fallback structure
- **`structure_generated_by: "ai"`** = AI was used to generate topic/module names

---

## ✅ Method 2: Check via API Response

When you create a course via the API, the response includes structure information:

### API Endpoint:
```
POST /api/v1/input
```

### Response includes:
```json
{
  "courseId": "uuid-here",
  "structureSummary": {
    "topics": 4,
    "modules": 8,
    "lessons": 15,
    "structureSource": "ai-generated"  // or "fallback"
  }
}
```

**Check the `structureSource` field:**
- `"ai-generated"` = AI was used ✅
- `"fallback"` = AI failed, used fallback ❌

---

## ✅ Method 3: Check Server Logs

When a course is created, the server logs show AI activity:

### Look for these log messages:

```
[Course Structure] Fetching all lessons from Content Studio...
[Course Structure] Total lessons fetched: 15
[Course Structure] Generating AI structure from lesson content...
[AI Structure Generator] Generating structure from lesson content...
[AI Structure Generator] Total lessons: 15
[AI Structure Generator] Calling OpenAI to generate structure...
[AI Structure Generator] ✅ Successfully generated structure
[Course Structure] AI structure generated (source: ai-generated)
[Course Structure] Topics: 4
```

### If AI fails, you'll see:

```
[AI Structure Generator] OPENAI_API_KEY not configured, using fallback
[AI Structure Generator] Generating fallback structure...
[Course Structure] AI structure generated (source: fallback)
```

---

## ✅ Method 4: Check Topics and Modules in Database

### Verify AI-generated topic/module names:

```sql
-- Get all topics for a course
SELECT 
  t.topic_name,
  t.topic_description,
  COUNT(DISTINCT m.id) as module_count,
  COUNT(DISTINCT l.id) as lesson_count
FROM topics t
LEFT JOIN modules m ON m.topic_id = t.id
LEFT JOIN lessons l ON l.module_id = m.id
WHERE t.course_id = 'YOUR_COURSE_ID'
GROUP BY t.id, t.topic_name, t.topic_description
ORDER BY t.topic_name;
```

```sql
-- Get all modules for a course
SELECT 
  t.topic_name,
  m.module_name,
  m.module_description,
  COUNT(l.id) as lesson_count
FROM modules m
JOIN topics t ON t.id = m.topic_id
LEFT JOIN lessons l ON l.module_id = m.id
WHERE t.course_id = 'YOUR_COURSE_ID'
GROUP BY t.topic_name, m.id, m.module_name, m.module_description
ORDER BY t.topic_name, m.module_name;
```

### AI-Generated Names Characteristics:

✅ **AI-generated names are:**
- Academic and professional (e.g., "Introduction to React", "State Management")
- Thematic/conceptual (e.g., "Advanced ES6+ Features", "Async Programming Patterns")
- 2-5 words long
- Reflect the actual lesson content

❌ **Fallback names are:**
- Generic (e.g., "Topic 1", "Topic 2", "Module 1")
- Sequential numbering
- Don't reflect lesson content

---

## ✅ Method 5: Create a Verification Script

Create a script to check AI usage:

```javascript
// check-ai-structure.js
import db from './config/database.js';
import { pgp } from './config/database.js';

async function checkAIStructure(courseId) {
  try {
    const course = await db.one(
      `SELECT 
        id,
        course_name,
        learning_path_designation
      FROM courses
      WHERE id = $1`,
      [courseId]
    );

    const metadata = course.learning_path_designation || {};
    
    console.log('\n' + '='.repeat(70));
    console.log(`📚 Course: ${course.course_name}`);
    console.log('='.repeat(70));
    console.log(`\n🤖 AI Structure Status:`);
    console.log(`   Source: ${metadata.structure_source || 'unknown'}`);
    console.log(`   Generated By: ${metadata.structure_generated_by || 'unknown'}`);
    console.log(`   Generated At: ${metadata.generated_at || 'unknown'}`);
    console.log(`\n📊 Structure Summary:`);
    console.log(`   Topics: ${metadata.total_topics || 0}`);
    console.log(`   Modules: ${metadata.total_modules || 0}`);
    console.log(`   Lessons: ${metadata.total_lessons || 0}`);
    
    if (metadata.structure_source === 'ai-generated') {
      console.log('\n✅ AI successfully generated the structure!');
    } else if (metadata.structure_source === 'fallback') {
      console.log('\n⚠️  AI was not used - fallback structure was applied');
    } else {
      console.log('\n❓ Unknown structure source');
    }
    
    // Get actual topics and modules
    const topics = await db.any(
      `SELECT 
        t.topic_name,
        COUNT(DISTINCT m.id) as modules,
        COUNT(DISTINCT l.id) as lessons
      FROM topics t
      LEFT JOIN modules m ON m.topic_id = t.id
      LEFT JOIN lessons l ON l.module_id = m.id
      WHERE t.course_id = $1
      GROUP BY t.id, t.topic_name
      ORDER BY t.topic_name`,
      [courseId]
    );
    
    console.log('\n📖 Topics Created:');
    topics.forEach((topic, idx) => {
      console.log(`   ${idx + 1}. ${topic.topic_name} (${topic.modules} modules, ${topic.lessons} lessons)`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pgp.end();
  }
}

// Usage: node check-ai-structure.js <course-id>
const courseId = process.argv[2];
if (!courseId) {
  console.error('Usage: node check-ai-structure.js <course-id>');
  process.exit(1);
}

checkAIStructure(courseId);
```

---

## 🎯 How Course Creation Triggers AI

### Flow:

1. **API Call** → `POST /api/v1/input`
2. **Controller** → `input.controller.js` receives request
3. **Service** → `generateStructure()` in `courseStructure.service.js`
4. **Fetch Lessons** → Gets lessons from Content Studio
5. **AI Generation** → `generateAIStructure()` in `AIStructureGenerator.js`
   - Calls OpenAI API with lesson content
   - AI analyzes lessons and groups them into topics/modules
   - Returns structured JSON
6. **Save to DB** → Topics, modules, and lessons are created
7. **Store Metadata** → AI info saved in `learning_path_designation`

---

## 🔧 Prerequisites for AI to Work

1. **OpenAI API Key** must be set:
   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
   ```

2. **Lessons must be fetched** from Content Studio
   - If no lessons are fetched, AI uses fallback structure

3. **Valid lesson content** must exist
   - AI needs lesson names, descriptions, or content to analyze

---

## 📝 Example: Testing AI Structure Generation

### 1. Create a course via API:

```bash
curl -X POST http://localhost:3000/api/v1/input \
  -H "Content-Type: application/json" \
  -d '{
    "learnerId": "10000000-0000-0000-0000-000000000001",
    "learnerName": "Alice Learner",
    "learningPath": [
      {
        "topicName": "JavaScript Fundamentals",
        "topicDescription": "Learn JavaScript basics"
      }
    ],
    "skills": ["javascript", "programming"],
    "level": "beginner",
    "duration": 10
  }'
```

### 2. Check the response:

```json
{
  "courseId": "...",
  "structureSummary": {
    "topics": 3,
    "modules": 6,
    "lessons": 12,
    "structureSource": "ai-generated"  // ✅ AI was used!
  }
}
```

### 3. Query the database:

```sql
SELECT 
  learning_path_designation->>'structure_source' as source,
  learning_path_designation->>'structure_generated_by' as by_ai
FROM courses
WHERE id = 'COURSE_ID_FROM_RESPONSE';
```

---

## 🚨 Troubleshooting

### If `structure_source` is "fallback":

1. **Check OpenAI API Key:**
   ```bash
   echo $OPENAI_API_KEY  # Should show your key
   ```

2. **Check server logs** for OpenAI errors

3. **Verify lessons were fetched:**
   - Look for: `[Course Structure] Total lessons fetched: X`
   - If X is 0, no lessons were available for AI to analyze

4. **Check OpenAI quota/limits:**
   - Ensure your OpenAI account has credits
   - Check for rate limiting errors in logs

---

## 📊 Summary

**To verify AI was used:**
1. ✅ Check `learning_path_designation->>'structure_source'` = `"ai-generated"`
2. ✅ Check `learning_path_designation->>'structure_generated_by'` = `"ai"`
3. ✅ Check topic/module names are meaningful (not "Topic 1", "Module 1")
4. ✅ Check server logs for `[AI Structure Generator] ✅ Successfully generated structure`

**If AI wasn't used:**
- `structure_source` will be `"fallback"`
- Topic names will be generic
- Check OpenAI API key and logs for errors
