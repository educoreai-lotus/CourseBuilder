# Enrollment Logic Review - Issues Found

## Problems Identified

### 1. **Duplicate Enrollment Storage**
The enrollment logic stores enrollment data in TWO places:
- `registrations` table (primary source)
- `course.studentsIDDictionary` (secondary/legacy source)

### 2. **Inconsistent Enrollment Checking**
When checking `is_enrolled`:
- Only checks `registrations` table
- Does NOT check `studentsIDDictionary` as fallback
- This creates inconsistency if registration exists but query fails

### 3. **Potential Issues**
- UUID format mismatch in queries
- Transaction timing issues (registration committed but query happens before commit)
- Case sensitivity in UUID comparison
- Whitespace in learner_id values

## Current Flow

### Registration (`registerLearner`):
1. Creates record in `registrations` table
2. Updates `studentsIDDictionary` on course
3. Returns success

### Enrollment Check (`getCourseDetails`):
1. Only queries `registrations` table
2. If found → `is_enrolled: true`
3. If not found → `is_enrolled: false`
4. Does NOT check `studentsIDDictionary`

## Recommended Fix

### Option 1: Check Both Sources (Defensive)
- Check `registrations` table first (primary)
- Fallback to `studentsIDDictionary` if not found
- Ensures enrollment is detected even if query has issues

### Option 2: Use Only One Source (Simplified)
- Use ONLY `registrations` table (standardized)
- Remove `studentsIDDictionary` updates
- Simpler, single source of truth

### Option 3: Improve Query Reliability
- Normalize UUID format before querying
- Trim whitespace from learner_id
- Add retry logic for transaction timing issues
- Use transaction isolation levels properly

## Implementation

Recommended: **Option 1** (check both sources) for backward compatibility and reliability.

