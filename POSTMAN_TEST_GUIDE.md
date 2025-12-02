# Testing AI Course Creation via Postman

## 🚀 Quick Setup

### 1. Import Postman Collection

1. Open Postman
2. Click **Import** button
3. Select the file: `Postman_Collection_AI_Course_Creation.json`
4. Collection will be imported with pre-configured requests

### 2. Set Environment Variable (Optional)

Create a Postman environment with:
- Variable: `base_url`
- Value: `https://coursebuilderfs-production.up.railway.app` (for Railway)
- Or: `http://localhost:3000` (for local testing)

Or manually replace `{{base_url}}` in the request URL.

---

## 📡 Test Request Details

### **Endpoint (Local):**
```
POST http://localhost:3000/api/v1/courses/input
```

### **Endpoint (Railway):**
```
POST https://coursebuilderfs-production.up.railway.app/api/v1/courses/input
```

### **Headers:**
```
Content-Type: application/json
x-service-name: test-script
x-role: service
x-user-role: service
```

### **Request Body:**
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

## ✅ What to Look For

### **Expected Response:**
```json
{
  "status": "accepted",
  "course_id": "uuid-here",
  "structure": {
    "topics": 2,
    "modules": 4,
    "lessons": 8,
    "structureSource": "ai-generated"  ← Should be "ai-generated" not "fallback"
  }
}
```

### **Check Server Logs**

When you send the request, check your backend server terminal for these logs:

**✅ Good Signs:**
```
[Course Structure] Content Studio not configured, simulating Content Studio response for topic "JavaScript Fundamentals"
[Course Structure] Generated 4 simulated Content Studio lessons for topic: JavaScript Fundamentals
[Course Structure] Total lessons fetched: 8
[Course Structure] Generating AI structure from lesson content...
[AI Structure Generator] Total lessons: 8
[AI Structure Generator] Calling OpenAI to generate structure...
[AI Structure Generator] ✅ Successfully generated structure
[Course Structure] AI structure generated (source: ai-generated)
```

**⚠️ Problem Signs:**
```
[Course Structure] Total lessons fetched: 0  ← No lessons simulated!
[Course Structure] No lessons fetched from Content Studio, using fallback structure
[AI Structure Generator] OPENAI_API_KEY not configured, using fallback  ← OpenAI not set
```

---

## 🔍 Verify in Database (Optional)

After creating the course, you can query the database to verify:

```sql
SELECT 
  c.course_name,
  c.learning_path_designation->>'structure_source' as structure_source,
  COUNT(DISTINCT t.id) as topics,
  COUNT(DISTINCT m.id) as modules,
  COUNT(DISTINCT l.id) as lessons
FROM courses c
LEFT JOIN topics t ON t.course_id = c.id
LEFT JOIN modules m ON m.topic_id = t.id
LEFT JOIN lessons l ON l.module_id = m.id
WHERE c.id = 'YOUR_COURSE_ID_HERE'
GROUP BY c.id, c.course_name, c.learning_path_designation;
```

---

## 🛠️ Troubleshooting

### **If structureSource is "fallback":**

1. **Check Content Studio Simulation:**
   - Look for: `[Course Structure] Content Studio not configured, simulating...`
   - Should see: `[Course Structure] Total lessons fetched: 8` (or more)

2. **Check OpenAI API Key:**
   - Make sure `OPENAI_API_KEY` is set in your `.env` file
   - Look for: `[AI Structure Generator] OPENAI_API_KEY not configured`

3. **Check Server Logs:**
   - Look for error messages in the backend terminal
   - Check if AI structure generator is failing

### **If no lessons are created:**

1. Content Studio simulation might not be working
2. Check server logs for error messages
3. Verify the learning_path array is being processed

---

## 📋 Manual Request in Postman

If you don't want to import the collection, here's the manual setup:

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/v1/courses/input`
3. **Headers tab:**
   - `Content-Type`: `application/json`
   - `x-service-name`: `test-script`
   - `x-role`: `service`
   - `x-user-role`: `service`
4. **Body tab:** Select "raw" and "JSON", paste the JSON above
5. **Click Send**

---

## 🎯 Success Criteria

✅ **Request returns:** `status: "accepted"`  
✅ **Response shows:** `structureSource: "ai-generated"`  
✅ **Structure has:** Topics > 0, Modules > 0, Lessons > 0  
✅ **Server logs show:** AI structure generation succeeded

---

## 💡 Tips

- **Keep backend server running** - `npm run dev` in backend folder
- **Watch server terminal** - You'll see detailed logs there
- **Check response carefully** - Look for `structureSource` field
- **Try different skills** - Change the `skills` array to see different structures
