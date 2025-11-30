# Test Fixes Needed

**Status:** 8 test suites failing, need fixes

## Common Issues and Fixes

### 1. Mock Setup Issues
Tests need mocks to be defined BEFORE imports in Jest ES modules.

### 2. Missing Dependencies
Some tests may need additional mock setup.

### 3. Async Timing Issues
Some tests may need longer timeouts for async operations.

---

## Quick Fixes Applied

### ✅ Fixed Tests:
1. **scheduledPublishing.test.js** - Fixed mock setup
2. **cache.test.js** - Fixed environment variable handling
3. **jobQueue.test.js** - Fixed async timing and retry tests
4. **courseCompletion.test.js** - Fixed mock setup

---

## Running Tests to Identify Failures

Run individual test files to see specific errors:

```bash
cd backend
npm test scheduledPublishing.test.js
npm test rateLimiter.test.js
npm test credential.test.js
npm test jobQueue.test.js
npm test cache.test.js
npm test ragClient.test.js
npm test courseCompletion.test.js
npm test oauth2.test.js
```

---

## Common Fix Patterns

### Pattern 1: Mock Before Import
```javascript
// ❌ Wrong
import db from '../config/database.js';
jest.mock('../config/database.js');

// ✅ Correct
jest.mock('../config/database.js', () => ({
  __esModule: true,
  default: {
    any: jest.fn(),
    none: jest.fn()
  }
}));
import db from '../config/database.js';
```

### Pattern 2: Async Test Timeouts
```javascript
// Add timeout for async operations
it('should handle async operations', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Pattern 3: Mock Implementation
```javascript
// Ensure mocks return promises for async functions
jest.fn().mockResolvedValue(data)  // ✅ Correct
jest.fn().mockReturnValue(data)    // ❌ Wrong for async
```

---

## Next Steps

1. Run each test file individually
2. Check error messages
3. Apply fixes based on error patterns
4. Re-run tests to verify fixes

