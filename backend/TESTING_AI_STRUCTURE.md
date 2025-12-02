# Testing AI Structure Generator

## Overview

This document explains how to test the new AI Structure Generator functionality.

## Files Created

1. **Unit Tests**: `backend/services/__tests__/AIStructureGenerator.test.js`
   - Comprehensive Jest unit tests
   - Tests AI structure generation
   - Tests fallback behavior
   - Tests validation
   - Tests error handling

2. **Manual Test Script**: `backend/test-ai-structure.js`
   - Interactive test script
   - Shows structure generation in action
   - Validates lesson assignments
   - Displays formatted output

## Running Tests

### Unit Tests

```bash
cd backend
npm test -- services/__tests__/AIStructureGenerator.test.js
```

Or run all tests:

```bash
npm test
```

### Manual Test Script

```bash
cd backend
node test-ai-structure.js
```

**Note**: The manual test script requires `OPENAI_API_KEY` to be set in `.env` for full testing. Without it, it will test fallback behavior.

## Test Coverage

### Unit Tests Cover:

✅ Successful AI structure generation  
✅ Fallback when no lessons provided  
✅ Fallback when API key missing  
✅ Fallback when API call fails  
✅ Fallback when invalid JSON response  
✅ Fallback when validation fails  
✅ Handling different lesson content formats  
✅ Parsing markdown-wrapped JSON  
✅ Correct OpenAI API parameters  
✅ Learning path and skills in prompt  

### Manual Test Script Covers:

✅ Full structure generation flow  
✅ Lesson assignment validation  
✅ Structure display  
✅ Performance timing  
✅ Error handling  

## Expected Behavior

### When OpenAI API Key is Configured:

1. Fetches all lessons from Content Studio
2. Sends lesson content to OpenAI
3. AI generates topic/module structure
4. Validates structure (all lessons assigned, proper counts)
5. Returns structure with `source: 'ai-generated'`

### When OpenAI Fails or Missing:

1. Falls back to structured grouping
2. Uses learning path topic names if available
3. Creates generic module names
4. Distributes lessons evenly
5. Returns structure with `source: 'fallback'`

## Validation Rules Tested

- ✅ Every lesson assigned exactly once
- ✅ 3-6 topics generated
- ✅ 2-5 modules per topic
- ✅ No duplicate assignments
- ✅ No unassigned lessons

## Example Output

### Successful AI Generation:

```
🧪 Testing AI Structure Generator
==================================================
✅ OPENAI_API_KEY is configured

📚 Input Lessons: 8
🎯 Learning Path Topics: 2
🛠️  Skills: react, javascript, frontend-development
==================================================

🔄 Generating structure...

==================================================
📊 RESULT

Source: ai-generated
Valid: true
Time: 2341ms

Topics: 2

📖 Topic 1: Introduction to React
   Fundamentals of React development
   Modules: 2
   📦 Module 1: React Basics
      Core concepts and components
      Lessons: 3 (lesson_1, lesson_2, lesson_3)
   📦 Module 2: React Hooks
      State management with hooks
      Lessons: 2 (lesson_4, lesson_5)

📖 Topic 2: Advanced React Concepts
   Advanced patterns and optimization
   Modules: 2
   📦 Module 1: State Management
      Context API and global state
      Lessons: 1 (lesson_6)
   📦 Module 2: Performance & Testing
      Optimization and testing strategies
      Lessons: 2 (lesson_7, lesson_8)

==================================================
✅ VALIDATION

Expected lessons: 8
Assigned lessons: 8
Unique lessons: 8

✅ All lessons properly assigned!
```

### Fallback Behavior:

```
🧪 Testing AI Structure Generator
==================================================
⚠️  OPENAI_API_KEY not set. Testing fallback behavior...

📊 RESULT

Source: fallback
Valid: true

Topics: 2

📖 Topic 1: React Fundamentals
   Modules: 2
   📦 Module 1: React Fundamentals - Module 1
      Lessons: 4 (lesson_1, lesson_2, lesson_3, lesson_4)
   📦 Module 2: React Fundamentals - Module 2
      Lessons: 4 (lesson_5, lesson_6, lesson_7, lesson_8)

📖 Topic 2: Advanced React Concepts
   Modules: 0
```

## Troubleshooting

### Test Fails to Run

1. Check that `OPENAI_API_KEY` is set in `.env`
2. Verify `openai` package is installed: `npm install openai`
3. Check Node.js version (should be 18+)

### Tests Pass but Manual Script Fails

1. Check `.env` file exists and has correct format
2. Verify `dotenv` package is installed
3. Check file permissions

### Structure Validation Fails

1. Check lesson IDs are consistent
2. Verify all lessons have valid IDs
3. Check OpenAI response format

## Next Steps

After testing:

1. ✅ Verify all tests pass
2. ✅ Run manual test script
3. ✅ Check structure quality
4. ✅ Validate lesson assignments
5. ✅ Review logs for errors

## Integration Testing

To test with real Content Studio:

1. Ensure Content Studio is running
2. Create a course with learning path
3. Check logs for `[Course Structure]` messages
4. Verify topics/modules in database
5. Check `learning_path_designation` metadata

