# RAG Chatbot Troubleshooting Guide

## Quick Debug Steps

### 1. Open Browser Console

Open your browser's developer console (F12) and look for messages starting with `[RAG Chatbot]`.

### 2. Check Initialization Logs

You should see logs like:
```
[RAG Chatbot] Hook triggered { userProfile: {...}, userRole: "learner" }
[RAG Chatbot] Configuration: { serviceIdentifier: "ASSESSMENT", ... }
[RAG Chatbot] Loading script...
[RAG Chatbot] Script loaded successfully
[RAG Chatbot] Initializing with config: {...}
[RAG Chatbot] ✅ Initialized successfully
```

### 3. Common Issues and Solutions

#### Issue: "User profile not available"
**Solution:** The user profile should always exist. If you see this, check:
- Is `AppProvider` wrapping your app?
- Is `userProfile` being set in `AppContext`?

#### Issue: "Failed to load script"
**Solution:** 
1. Check the script URL in console logs
2. Verify `VITE_RAG_SERVICE_URL` is set correctly
3. Test the URL manually: `https://rag-service.educore.com/embed/bot.js`
4. Check for CORS errors in Network tab

#### Issue: "Container #edu-bot-container not found"
**Solution:** 
- The container should be in `index.html`
- If missing, the code will create it automatically
- Check browser console for container creation message

#### Issue: "initializeEducoreBot not available after retries"
**Solution:**
- The RAG script might not be loading correctly
- Check Network tab for failed requests
- Verify the RAG service is running
- Check browser console for script errors

#### Issue: "Invalid microservice"
**Solution:**
- The microservice identifier must be `"ASSESSMENT"` or `"DEVLAB"`
- Check `VITE_CHATBOT_MICROSERVICE` environment variable
- Default is now `"ASSESSMENT"` (changed from `"COURSE_BUILDER"`)

### 4. Manual Testing

Open browser console and run:

```javascript
// Check if script loaded
console.log('Script loaded:', window.EDUCORE_BOT_LOADED)
console.log('Init function:', typeof window.initializeEducoreBot)

// Check container
console.log('Container:', document.querySelector('#edu-bot-container'))

// Check user profile
console.log('User profile:', window.localStorage.getItem('coursebuilder:userRole'))
```

### 5. Network Tab Checks

1. Open Network tab in DevTools
2. Filter by "bot.js" or "bot-bundle.js"
3. Check if requests are successful (status 200)
4. Look for CORS errors (red requests)

### 6. Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_RAG_SERVICE_URL=https://rag-service.educore.com
VITE_CHATBOT_MICROSERVICE=ASSESSMENT
```

**Note:** After changing `.env`, restart your dev server!

### 7. Verify RAG Service

Test if the RAG service is accessible:

```bash
# Test script endpoint
curl https://rag-service.educore.com/embed/bot.js

# Test health endpoint (if available)
curl https://rag-service.educore.com/health
```

## Still Not Working?

1. **Check all console logs** - Look for any error messages
2. **Check Network tab** - Look for failed requests
3. **Verify RAG service URL** - Make sure it's correct and accessible
4. **Check microservice identifier** - Must be "ASSESSMENT" or "DEVLAB"
5. **Contact RAG service team** - They may need to:
   - Add your frontend URL to CORS allowed origins
   - Verify Course Builder support
   - Check service status

