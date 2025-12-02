# AI-Based Topic & Module Structure Generation

## Overview

The Course Structure Service now uses AI (OpenAI) to generate topic and module names based on actual lesson content from Content Studio, rather than using the learning path directly.

## Changes Made

### 1. New Service: `AIStructureGenerator.js`

**Location:** `backend/services/AIStructureGenerator.js`

**Purpose:** Analyzes lesson content and generates intelligent topic/module structure.

**Key Functions:**
- `generateAIStructure()` - Main function that uses OpenAI to create structure
- `validateAIStructure()` - Validates that all lessons are properly assigned
- `generateFallbackStructure()` - Creates fallback structure if AI fails

### 2. Updated: `courseStructure.service.js`

**Location:** `backend/services/courseStructure.service.js`

**Changes:**
- **Step 1:** First fetches ALL lessons from Content Studio for all topics/skills
- **Step 2:** Uses AI to analyze lesson content and generate topic/module structure
- **Step 3:** Creates topics and modules based on AI-generated names
- **Step 4:** Assigns lessons to appropriate modules based on AI grouping

### 3. How It Works

#### Flow:
1. **Fetch Lessons First**
   - Iterates through all topics in learning path
   - Calls Content Studio to get lessons for each topic
   - Collects all lessons into a single array

2. **AI Analysis**
   - Sends all lesson content to OpenAI
   - AI analyzes lesson themes, concepts, and content
   - AI groups lessons into topics (3-6) and modules (2-5 per topic)
   - AI generates meaningful names based on actual content

3. **Validation**
   - Ensures every lesson is assigned exactly once
   - Validates topic/module counts are within ranges
   - Verifies structure integrity

4. **Structure Creation**
   - Creates topics with AI-generated names
   - Creates modules with AI-generated names
   - Assigns lessons to their designated modules

5. **Fallback**
   - If AI fails or validation fails, uses fallback structure
   - Fallback uses generic names: "Topic 1", "Module 1.1", etc.
   - Still continues structure creation

## AI Prompt Structure

The AI receives:
- Learning path summary
- Skills list
- Complete lesson content (names, descriptions, content previews)

The AI returns JSON with:
```json
{
  "topics": [
    {
      "topic_name": "Introduction to React",
      "topic_description": "...",
      "modules": [
        {
          "module_name": "React Fundamentals",
          "module_description": "...",
          "lesson_ids": ["lesson_1", "lesson_2"]
        }
      ]
    }
  ]
}
```

## Validation Rules

- ✅ Every lesson must be assigned to exactly one module
- ✅ Topics: 3-6 topics
- ✅ Modules: 2-5 modules per topic
- ✅ No duplicate lesson assignments
- ✅ No unassigned lessons

## Fallback Behavior

If AI generation fails:
- Uses learning path topic names if available
- Creates generic topic/module names
- Distributes lessons evenly
- Continues structure creation without errors

## What Was NOT Changed

- ❌ Database schema
- ❌ API endpoints
- ❌ Enrichment endpoints
- ❌ Trainer flows
- ❌ Marketplace logic
- ❌ Publishing flow
- ❌ Unified API structure

## Metadata Updates

The `learning_path_designation` field now includes:
- `structure_source`: "ai-generated" or "fallback"
- `structure_generated_by`: "ai"
- `total_topics`: Number of topics created
- `total_modules`: Number of modules created

## Testing

To test the new AI structure generation:

1. Create a course with a learning path
2. Check logs for `[Course Structure]` messages
3. Verify topics/modules have meaningful names
4. Verify all lessons are assigned correctly

## Error Handling

- Graceful fallback on AI failures
- Continues structure creation even if some topics fail
- Logs all errors for debugging
- No breaking changes to existing functionality

