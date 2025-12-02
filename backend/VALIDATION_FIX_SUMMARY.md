# Validation Fix Summary

## Issue
Tests were failing because validation was too strict - it required 3-6 topics and 2-5 modules per topic, even for small inputs.

## Solution
Made validation proportional to the number of lessons:

### Topic Count Validation:
- **1-6 lessons**: Allow 1-6 topics
- **7-12 lessons**: Require 2-6 topics  
- **13+ lessons**: Require 3-6 topics

### Module Count Validation:
- **1-6 lessons**: Allow 1-5 modules per topic
- **7+ lessons**: Require 2-5 modules per topic

## Changes Made

### In `validateAIStructure()`:

1. **Dynamic topic validation** based on lesson count:
   ```javascript
   const lessonCount = allLessons.length;
   let minTopics = 1;
   let maxTopics = 6;
   
   if (lessonCount > 12) {
     minTopics = 3;
   } else if (lessonCount > 6) {
     minTopics = 2;
   }
   ```

2. **Dynamic module validation** based on lesson count:
   ```javascript
   const minModulesPerTopic = lessonCount <= 6 ? 1 : 2;
   const maxModulesPerTopic = 5;
   ```

## Test Impact

Tests with small lesson counts (1-6 lessons) can now pass validation with:
- 1-6 topics (instead of requiring 3+)
- 1 module per topic (instead of requiring 2+)

This makes the validation more realistic and allows the tests to pass while still maintaining quality standards for larger course structures.

