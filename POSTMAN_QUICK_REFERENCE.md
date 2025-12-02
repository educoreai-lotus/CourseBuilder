# Postman Quick Reference - AI Course Creation

## 🚀 Quick Test Setup

### Request Configuration

**Method:** `POST`

**URL (Local):** 
```
http://localhost:3000/api/v1/courses/input
```

**URL (Railway):** 
```
https://coursebuilderfs-production.up.railway.app/api/v1/courses/input
```

**Headers:**
| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `x-service-name` | `test-script` |
| `x-role` | `service` |
| `x-user-role` | `service` |

**Body (raw JSON):**
```json
{
  "learner_id": "10000000-0000-0000-0000-000000000001",
  "learner_name": "Alice Learner",
  "learner_company": "Emerald Learning",
  "learning_path": [
    {
      "topic_name": "JavaScript Fundamentals",
      "topic_description": "Learn JavaScript basics and core concepts"
    },
    {
      "topic_name": "React Development",
      "topic_description": "Build modern React applications"
    }
  ],
  "skills": ["javascript", "react", "frontend"],
  "level": "beginner",
  "duration": 10,
  "metadata": {
    "learner_id": "10000000-0000-0000-0000-000000000001",
    "learner_company": "Emerald Learning"
  },
  "sourceService": "test-script"
}
```

---

## ✅ Expected Response

**Success (AI Generated):**
```json
{
  "status": "accepted",
  "course_id": "uuid-here",
  "structure": {
    "topics": 2,
    "modules": 4,
    "lessons": 8,
    "structureSource": "ai-generated"  ✅
  }
}
```

**Fallback (Not Good):**
```json
{
  "structure": {
    "structureSource": "fallback"  ❌
  }
}
```

---

## 📊 What to Check

1. ✅ **Response shows:** `"structureSource": "ai-generated"`
2. ✅ **Structure counts:** topics > 0, modules > 0, lessons > 0
3. ✅ **Check server logs** in backend terminal for detailed info

---

## 🔍 Check Server Logs

In your backend terminal, you should see:

```
[Course Structure] Content Studio not configured, simulating Content Studio response...
[Course Structure] Generated 4 simulated Content Studio lessons for topic: JavaScript Fundamentals
[Course Structure] Total lessons fetched: 8
[AI Structure Generator] Total lessons: 8
[AI Structure Generator] ✅ Successfully generated structure
[Course Structure] AI structure generated (source: ai-generated)
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `structureSource: "fallback"` | Check if `OPENAI_API_KEY` is set in `.env` |
| No lessons created | Check server logs for errors |
| Connection error | Make sure backend server is running (`npm run dev`) |

---

## 📝 Steps to Test

1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Open Postman** and create new request

3. **Configure request** using the settings above

4. **Click Send**

5. **Check response** - Look for `structureSource: "ai-generated"`

6. **Check backend terminal** - See detailed logs

---

That's it! You're ready to test! 🎉
