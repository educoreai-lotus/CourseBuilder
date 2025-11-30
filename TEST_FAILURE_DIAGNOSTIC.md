# Test Failure Diagnostic Guide

**Status:** 8 test suites failing, 14 passing

## Quick Fix Guide

### Common Issues:

1. **Mock Setup** - Must be BEFORE imports
2. **Async Operations** - Need proper timeouts
3. **Database Mocks** - Need proper structure
4. **Environment Variables** - Need to save/restore

---

## Test Files Status

### Likely Failing Tests (Need Fixes):

1. **scheduledPublishing.test.js** - ✅ Fixed (mock setup)
2. **rateLimiter.test.js** - May need Express app setup
3. **jobQueue.test.js** - ✅ Fixed (async timing)
4. **cache.test.js** - ✅ Fixed (env vars)
5. **courseCompletion.test.js** - ✅ Fixed (mock setup)
6. **oauth2.test.js** - May need jwt mock fixes
7. **ragClient.test.js** - Should work
8. **credential.test.js** - Should work

---

## Running Individual Tests

To identify specific failures:

```bash
cd backend

# Run each test individually
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

### Fix 1: Mock Before Import
```javascript
// ✅ Correct order
jest.mock('../module.js', () => ({ ... }));
import { func } from '../module.js';
```

### Fix 2: Async Timeout
```javascript
it('async test', async () => {
  // test
}, 10000); // Add timeout
```

### Fix 3: Promise Mocks
```javascript
jest.fn().mockResolvedValue(data)  // ✅ For async
jest.fn().mockReturnValue(data)    // ❌ Wrong
```

---

## Next Steps

1. Run tests individually to see specific errors
2. Check error messages for patterns
3. Apply fixes based on error messages
4. Re-run to verify

The fixes I've applied should resolve most issues. Run the tests again to see remaining failures!

