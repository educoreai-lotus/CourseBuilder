# RAG Chatbot Integration

This document describes the RAG chatbot widget integration in the Course Builder frontend.

## Overview

The RAG chatbot widget has been integrated following the official integration guide. The chatbot will appear automatically when a user is logged in.

## Configuration

### Environment Variables

Add these to your `.env` file (or set in your deployment platform):

```env
# RAG Chatbot Configuration
# URL of the RAG service that hosts the chatbot widget
VITE_RAG_SERVICE_URL=https://rag-service.educore.com

# Microservice identifier for chatbot
# Options: "ASSESSMENT", "DEVLAB", or check with RAG team for Course Builder support
# If Course Builder is not directly supported, you may need to use one of the above
VITE_CHATBOT_MICROSERVICE=COURSE_BUILDER
```

### Important Note on Microservice Identifier

The integration guide mentions that only `"ASSESSMENT"` and `"DEVLAB"` are currently supported microservice identifiers. Course Builder may need:

1. **A new identifier** - Check with the RAG service team if `"COURSE_BUILDER"` is supported
2. **Use an existing identifier** - If Course Builder is not directly supported, you may need to use `"ASSESSMENT"` or `"DEVLAB"` temporarily

## How It Works

1. **Container**: The chatbot container `<div id="edu-bot-container"></div>` is added to `index.html`

2. **Script Loading**: The RAG chatbot script is loaded dynamically via the `useRAGChatbot` hook

3. **Initialization**: The `RAGChatbotInitializer` component initializes the chatbot when:
   - User is logged in (has a user profile)
   - The RAG script has loaded
   - User authentication data is available

4. **Authentication**: The chatbot uses:
   - `userId`: From `userProfile.id`
   - `token`: From `localStorage.getItem('token')` or a mock token (needs to be replaced with actual JWT in production)
   - `tenantId`: From `userProfile.company` or `'default'`

## Files Modified/Created

- `frontend/index.html` - Added chatbot container div
- `frontend/src/hooks/useRAGChatbot.js` - Hook for initializing the chatbot
- `frontend/src/components/RAGChatbotInitializer.jsx` - Component that uses the hook
- `frontend/src/App.jsx` - Added RAGChatbotInitializer component (replaced old ChatbotWidget)

## Authentication Token

**⚠️ IMPORTANT**: The current implementation uses a mock token:

```javascript
const token = localStorage.getItem('token') || `mock-token-${userProfile.id}`
```

**You need to replace this with your actual JWT token** from your authentication system. Update the `useRAGChatbot` hook to get the real token from your auth context or API.

## Testing

1. **Set environment variables** in your `.env` file
2. **Start the frontend**: `npm run dev`
3. **Log in** as a user (the chatbot only initializes for logged-in users)
4. **Check browser console** for initialization messages
5. **Look for the chatbot widget** in the bottom-right corner of the page

## Troubleshooting

### Chatbot doesn't appear

1. Check browser console for errors
2. Verify `VITE_RAG_SERVICE_URL` is set correctly
3. Ensure user is logged in (has `userProfile.id`)
4. Check Network tab for failed script loads

### "Invalid microservice" error

The microservice identifier might not be supported. Try:
- `"ASSESSMENT"` 
- `"DEVLAB"`
- Or contact RAG service team for Course Builder support

### CORS errors

Ensure the RAG service has your frontend URL in its CORS allowed origins.

## Next Steps

1. **Replace mock token** with real JWT token from your auth system
2. **Verify microservice identifier** with RAG service team
3. **Test in production** environment
4. **Configure CORS** on RAG service if needed

