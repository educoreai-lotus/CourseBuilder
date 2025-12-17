# Chatbot UI Control Limitations - Investigation Report

## 🔍 Investigation Summary

### Documentation Review

**Checked Documentation:**
- ✅ `docs/FOR_MICROSERVICE_DEVELOPERS.md`
- ✅ `docs/WHAT_MICROSERVICES_NEED_TO_DO.md`

**Documented Parameters for `initializeEducoreBot()`:**

#### Required Parameters:
- `microservice` (string) - Microservice identifier
- `userId` (string) - Authenticated user ID  
- `token` (string) - JWT or session token

#### Optional Parameters:
- `tenantId` (string) - Tenant identifier (default: `"default"`)
- `container` (string) - CSS selector for container (default: `"#edu-bot-container"`)

### ❌ UI Configuration Options NOT Documented

The official documentation does **NOT** mention any UI control options:
- ❌ `defaultOpen` - Control initial open/closed state
- ❌ `autoOpen` - Prevent auto-opening
- ❌ `collapsed` - Start in collapsed state
- ❌ `launcherOnly` - Show only launcher button
- ❌ `position` - Control widget position
- ❌ `mode` - Control widget mode
- ❌ `onReady` - Lifecycle callback
- ❌ `onOpen` - Open event callback
- ❌ `onClose` - Close event callback

---

## ⚠️ ROOT CAUSE

### Current Problems

1. **Chatbot auto-opens on load**
   - No documented option to prevent this
   - Widget opens immediately after initialization

2. **Window renders partially off-screen**
   - No positioning control available
   - Widget position is hardcoded in embed script

3. **Cannot be closed properly**
   - No lifecycle hooks to detect close events
   - No programmatic close API

4. **CSS fixes are ineffective**
   - External script uses iframe or Shadow DOM
   - Our CSS cannot penetrate embed boundary
   - Widget styling is controlled entirely by RAG service

### Why CSS Doesn't Work

- ✅ **Verified:** No CSS targeting `#edu-bot-container` exists in our codebase
- ✅ **Confirmed:** External embed script (`bot.js`) renders its own UI
- ✅ **Confirmed:** Widget likely uses iframe or Shadow DOM (isolated styling)
- ✅ **Confirmed:** Our CSS cannot penetrate the embed boundary

---

## ✅ Actions Taken

### 1. Removed CSS Attempts
- ✅ Verified no CSS targeting chatbot exists
- ✅ Confirmed old chatbot CSS is commented out (line 3706: `/* RAG Chatbot integration temporarily removed */`)

### 2. Added Function Inspection
- ✅ Added logging to inspect `window.initializeEducoreBot` function signature
- ✅ Will log available parameters when script loads

### 3. Attempted Undocumented Options
- ✅ Added code to try common UI configuration options
- ✅ Falls back gracefully if options are not supported
- ✅ Logs what options are being attempted

**Updated Code:**
```javascript
// Attempts to use UI options if they exist (undocumented)
const possibleOptions = {
  defaultOpen: false,
  autoOpen: false,
  collapsed: true,
  startCollapsed: true,
  launcherOnly: true,
  position: 'bottom-right'
}
```

---

## 📋 Next Steps

### Step 1: Runtime Inspection (REQUIRED)

**Action:** When chatbot loads, check browser console for:
1. Function signature log: `[RAG Chatbot] Function signature: ...`
2. Config attempt log: `[RAG Chatbot] Attempting config: ...`
3. Any errors or warnings

**How to inspect:**
1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Look for `[RAG Chatbot]` logs
4. Check if options are accepted or ignored

### Step 2: Manual Script Inspection (RECOMMENDED)

**Action:** Inspect the actual `bot.js` script:

1. Open Network tab in DevTools
2. Find `bot.js` request
3. Click to view source
4. Search for `initializeEducoreBot` function definition
5. Check what parameters it accepts

**Alternative:** In Console, type:
```javascript
window.initializeEducoreBot.toString()
```

### Step 3: Test Results

**If options work:**
- ✅ Chatbot stays closed on load
- ✅ Only launcher icon visible
- ✅ Clicking opens chat properly
- ✅ Chat stays in viewport

**If options DON'T work:**
- ❌ Chatbot still auto-opens
- ❌ No change in behavior
- ❌ Options are silently ignored

---

## 🎯 ACCEPTANCE CRITERIA STATUS

- [ ] Chatbot is closed on load
- [ ] Only launcher icon is visible  
- [ ] Clicking icon opens full chat
- [ ] Chat stays fully inside viewport
- [ ] Behavior is deterministic (no flicker)

**Current Status:** ⏳ **PENDING RUNTIME TESTING**

---

## 📝 Recommendations

### If UI Options Exist and Work:
1. ✅ Document the working options
2. ✅ Update integration guide
3. ✅ Remove fallback code
4. ✅ Test thoroughly

### If UI Options DO NOT Exist:
1. ❌ **STOP** trying to fix UX from our side
2. 📝 **REPORT** to RAG team with clear requirements:
   - Need `defaultOpen: false` option
   - Need `autoOpen: false` option  
   - Need `position` control
   - Need lifecycle callbacks (`onOpen`, `onClose`)
3. 💡 **PROPOSE** solutions:
   - **Option A:** Add UI configuration API to embed script
   - **Option B:** Provide iframe URL with query parameters for control
   - **Option C:** Add programmatic API (`window.educoreBot.close()`, etc.)

---

## ⚠️ Current Limitation Statement

**If UI options do not exist or do not work:**

> **UI behavior is controlled entirely by the embed script (`bot.js`).**
> 
> We cannot control:
> - Initial open/closed state
> - Widget positioning
> - Auto-open behavior
> - Close behavior
> 
> **This is NOT a bug in our implementation.**
> 
> **This is a limitation of the embed API.**

---

**Report Generated:** 2025-01-27  
**Status:** Awaiting runtime testing results

