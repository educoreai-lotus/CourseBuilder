# Testing on Railway

## 🚀 Quick Setup for Railway Testing

### Railway URL
```
https://coursebuilderfs-production.up.railway.app
```

---

## 📡 Postman Configuration

### Option 1: Update Collection Variable

1. Open Postman
2. Import `Postman_Collection_AI_Course_Creation.json`
3. Click on the collection name
4. Go to **Variables** tab
5. Change `base_url` value to:
   ```
   https://coursebuilderfs-production.up.railway.app
   ```
6. Save

### Option 2: Create Environment

1. In Postman, click **Environments** (left sidebar)
2. Click **+** to create new environment
3. Name it: `Railway Production`
4. Add variable:
   - **Variable:** `base_url`
   - **Initial Value:** `https://coursebuilderfs-production.up.railway.app`
   - **Current Value:** `https://coursebuilderfs-production.up.railway.app`
5. Click **Save**
6. Select this environment from the dropdown (top right)

### Option 3: Manual URL

Just replace the URL in the request:
```
https://coursebuilderfs-production.up.railway.app/api/v1/courses/input
```

---

## ✅ Test Request

**Method:** `POST`

**URL:** 
```
https://coursebuilderfs-production.up.railway.app/api/v1/courses/input
```

**Headers:**
```
Content-Type: application/json
x-service-name: test-script
x-role: service
x-user-role: service
```

**Body:** (Same as local - see POSTMAN_QUICK_REFERENCE.md)

---

## 🔍 Differences from Local Testing

| Aspect | Local | Railway |
|--------|-------|---------|
| **URL** | `http://localhost:3000` | `https://coursebuilderfs-production.up.railway.app` |
| **Protocol** | HTTP | HTTPS |
| **Server Logs** | Your terminal | Railway dashboard logs |
| **Database** | Local/Supabase | Railway database |

---

## 📊 What to Check

### ✅ Expected Response (Same as Local)
```json
{
  "status": "accepted",
  "course_id": "uuid-here",
  "structure": {
    "topics": 2,
    "modules": 4,
    "lessons": 8,
    "structureSource": "ai-generated"
  }
}
```

### 🔍 Check Railway Logs

1. Go to Railway dashboard
2. Select your project
3. Click on the service
4. Go to **Logs** tab
5. Look for the same log messages as local:
   ```
   [Course Structure] Content Studio not configured, simulating...
   [Course Structure] Total lessons fetched: 8
   [AI Structure Generator] ✅ Successfully generated structure
   ```

---

## ⚠️ Important Notes

1. **HTTPS Required:** Railway uses HTTPS, not HTTP
2. **Environment Variables:** Make sure Railway has:
   - `OPENAI_API_KEY` set (for AI generation)
   - `DATABASE_URL` set (for database connection)
   - `CONTENT_STUDIO_API_URL` NOT set (to trigger simulation)
3. **CORS:** Railway should handle CORS, but if you get CORS errors, check Railway settings
4. **Response Time:** Railway might be slightly slower than local

---

## 🛠️ Troubleshooting

### Connection Refused / Timeout
- Check if Railway service is running
- Verify the URL is correct (HTTPS, not HTTP)
- Check Railway deployment status

### 401/403 Errors
- Verify headers are set correctly:
  - `x-service-name: test-script`
  - `x-role: service`
  - `x-user-role: service`

### structureSource: "fallback"
- Check Railway environment variables
- Verify `OPENAI_API_KEY` is set in Railway
- Check Railway logs for error messages

---

## 🎯 Quick Test Checklist

- [ ] Railway service is deployed and running
- [ ] Using HTTPS URL (not HTTP)
- [ ] Headers are set correctly
- [ ] Request body is valid JSON
- [ ] Check Railway logs for detailed info
- [ ] Response shows `structureSource: "ai-generated"`

---

## 💡 Pro Tips

1. **Use Postman Environments** - Switch between local and Railway easily
2. **Save Requests** - Save successful requests for future testing
3. **Check Logs First** - Railway logs show what's happening server-side
4. **Test Incrementally** - Start with simple requests, then test full flow

---

Ready to test on Railway! 🚀
