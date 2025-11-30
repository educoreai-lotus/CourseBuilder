# How to Run Tests and Fix Failures

## Quick Test Run Commands

### Run All Tests:
```bash
cd backend
npm test
```

### Run Specific Test File:
```bash
cd backend
npm test scheduledPublishing.test.js
npm test cache.test.js
npm test jobQueue.test.js
# etc.
```

### Run Tests with Verbose Output:
```bash
cd backend
npm test -- --verbose
```

### See Specific Failures:
```bash
cd backend
npm test 2>&1 | grep -A 10 "FAIL"
```

---

## Common Test Fixes

If tests fail, check:

1. **Mock Setup** - Mocks must be defined BEFORE imports
2. **Async Issues** - Use proper async/await and timeouts
3. **Environment Variables** - Save/restore env vars in tests
4. **Promise Returns** - Use `mockResolvedValue` not `mockReturnValue`

---

## Files That May Need Fixes

The following test files were just created and may need adjustments:

1. `scheduledPublishing.test.js` - ✅ Fixed
2. `rateLimiter.test.js` - May need app setup fixes
3. `credential.test.js` - Should work
4. `jobQueue.test.js` - ✅ Fixed async issues
5. `cache.test.js` - ✅ Fixed env var handling
6. `ragClient.test.js` - Should work
7. `courseCompletion.test.js` - ✅ Fixed mock setup
8. `oauth2.test.js` - Should work

---

## Quick Fix Checklist

- [ ] Check mock setup (before imports)
- [ ] Check async/await usage
- [ ] Check timeout values for slow tests
- [ ] Check environment variable handling
- [ ] Check promise mocking (mockResolvedValue)
- [ ] Check error handling in tests

---

## Test Status

After running tests, identify which specific tests fail and apply fixes based on error messages.

