# Postman Test Collection: Enrichment Assets API

## Endpoint
`POST /api/enrichment/assets`

## Base URL
- **Local Development**: `http://localhost:3000`
- **Production**: `https://coursebuilderfs-production.up.railway.app/api/enrichment/assets`

## Request Headers
```
Content-Type: application/json
```

## Request Body (JSON)
```json
{
  "topic": "React performance",
  "skills": ["react", "frontend", "web performance"],
  "maxItems": 6
}
```

### Required Fields
- `topic` (string): The main topic or subject for enrichment

### Optional Fields
- `skills` (array of strings): Related skills or keywords
- `maxItems` (number): Maximum number of items per category (default: 6)

## Example Requests

### Example 1: Basic Request
```json
{
  "topic": "JavaScript async programming",
  "skills": ["promises", "async/await", "callbacks"],
  "maxItems": 5
}
```

### Example 2: Minimal Request
```json
{
  "topic": "Docker containerization"
}
```

### Example 3: Full Request
```json
{
  "topic": "Machine Learning Fundamentals",
  "skills": ["python", "tensorflow", "neural networks", "data science"],
  "maxItems": 8
}
```

## Expected Response (Success - 200 OK)
```json
{
  "tags": ["react", "performance", "optimization"],
  "videos": [
    {
      "id": "video-id-123",
      "title": "React Performance Optimization",
      "url": "https://www.youtube.com/watch?v=...",
      "channelTitle": "Tech Channel",
      "durationISO": "PT15M30S",
      "publishedAt": "2024-01-15T10:00:00Z",
      "viewCount": 50000,
      "likeCount": 1200
    }
  ],
  "repos": [
    {
      "id": 123456789,
      "name": "owner/repo-name",
      "url": "https://github.com/owner/repo-name",
      "description": "Repository description",
      "stars": 1500,
      "lastCommit": "2024-01-20T08:30:00Z",
      "language": "JavaScript",
      "topics": ["react", "performance"]
    }
  ],
  "suggestedUrls": {
    "youtube": ["https://youtube.com/..."],
    "github": ["https://github.com/..."]
  },
  "source": "gemini+apis",
  "generatedAt": "2024-01-25T12:00:00.000Z"
}
```

## Error Responses

### 400 Bad Request - Missing Topic
```json
{
  "error": "topic is required",
  "message": "The request body must include a \"topic\" field (string)"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to enrich assets",
  "message": "Error details here"
}
```

## Postman Collection Setup

1. **Create a new request** in Postman
2. **Set method** to `POST`
3. **Set URL** to `{{baseUrl}}/api/enrichment/assets`
   - Create an environment variable `baseUrl` (e.g., `http://localhost:3000`)
4. **Add headers**:
   - `Content-Type: application/json`
5. **Set body** to `raw` and `JSON`, then paste one of the example request bodies above
6. **Send the request**

## Testing Checklist

- [ ] Test with valid topic only
- [ ] Test with topic + skills array
- [ ] Test with topic + skills + maxItems
- [ ] Test with missing topic (should return 400)
- [ ] Test with invalid topic type (should return 400)
- [ ] Verify response contains `tags`, `videos`, `repos`, `suggestedUrls`
- [ ] Check that `videos` array contains valid YouTube URLs
- [ ] Check that `repos` array contains valid GitHub URLs
- [ ] Verify `generatedAt` timestamp is present

## Environment Variables Required (Backend)

Make sure these are set in your backend environment:
- `GEMINI_API_KEY` - Google Gemini API key (required)
- `YOUTUBE_API_KEY` - YouTube Data API v3 key (required)
- `GITHUB_TOKEN` - GitHub personal access token (optional, improves rate limits)

## Troubleshooting

1. **Empty results**: Check that API keys are set correctly
2. **Timeout errors**: The service has a 25-second timeout
3. **CORS errors**: Ensure CORS is configured correctly in `server.js`
4. **401 Unauthorized**: Check authentication middleware settings (may be disabled in development)



