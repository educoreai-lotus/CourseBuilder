# OpenAI Integration Testing Guide

## ✅ Migration Complete

All Gemini references have been replaced with OpenAI in the enrichment flow:

- ✅ OpenAI SDK installed (`openai` package)
- ✅ New `OpenAIIntentService.js` created
- ✅ `AssetEnrichmentService.js` updated to use OpenAI
- ✅ Test endpoint created at `/api/test/openai`
- ✅ Environment variables configured

## 🧪 How to Test

### Option 1: Test via HTTP Endpoint (Recommended)

1. **Start the server:**
   ```bash
   cd backend
   npm start
   # or for development
   npm run dev
   ```

2. **Test the endpoint:**
   ```bash
   curl http://localhost:3000/api/test/openai
   ```

   Or use a browser: `http://localhost:3000/api/test/openai`

   Expected response:
   ```json
   {
     "output": "AI enrichment is working",
     "timestamp": "2025-..."
   }
   ```

### Option 2: Run Standalone Test Script

```bash
cd backend
node test-openai.js
```

This will test:
- ✅ `runOpenAI()` helper function
- ✅ `generateIntents()` function with topic and skills

### Option 3: Test Enrichment Endpoint

Test the actual enrichment endpoint:

```bash
curl -X POST http://localhost:3000/api/enrichment/assets \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "React Hooks",
    "skills": ["react", "javascript"],
    "maxItems": 6
  }'
```

## 🔍 Verification Checklist

- [ ] Server starts without errors
- [ ] `/api/test/openai` returns success response
- [ ] `/api/enrichment/assets` returns enrichment data with `source: "openai+apis"`
- [ ] Check logs for `[OpenAI]` messages (not `[Gemini]`)
- [ ] Verify environment variable `OPENAI_API_KEY` is set

## 📝 Environment Variables Required

Make sure your `.env` file has:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

## 🐛 Troubleshooting

1. **"OPENAI_API_KEY not configured"**
   - Check `.env` file exists and has `OPENAI_API_KEY`
   - Restart server after updating `.env`

2. **"openai package not found"**
   - Run `npm install` in backend directory

3. **API errors**
   - Verify API key is valid
   - Check API key has sufficient credits
   - Check network connectivity

## 📊 Expected Log Output

When working correctly, you should see:
```
[OpenAI] Using model: gpt-4o-mini
[OpenAI] Successfully generated intents
```

NOT:
```
[Gemini] ...
```
