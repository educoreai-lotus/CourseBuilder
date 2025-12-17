# Chatbot UI Control Analysis

## 🔍 Investigation Results

### Documentation Review

**Checked Files:**
- `docs/FOR_MICROSERVICE_DEVELOPERS.md`
- `docs/WHAT_MICROSERVICES_NEED_TO_DO.md`

**Documented Parameters for `initializeEducoreBot()`:**

#### Required:
- `microservice` (string)
- `userId` (string)
- `token` (string)

#### Optional:
- `tenantId` (string) - default: `"default"`
- `container` (string) - default: `"#edu-bot-container"`

### ❌ UI Configuration Options NOT Found

The documentation does **NOT** mention any of these options:
- ❌ `defaultOpen`
- ❌ `autoOpen`
- ❌ `collapsed`
- ❌ `launcherOnly`
- ❌ `position`
- ❌ `mode`
- ❌ `onReady`
- ❌ `onOpen`
- ❌ `onClose`

### 📋 Current Implementation

**File:** `frontend/src/components/RAGChatbotInitializer.jsx`

```javascript
window.initializeEducoreBot({
  microservice: 'COURSE_BUILDER',
  userId: userProfile.id,
  token,
  tenantId: userProfile.company || 'default'
})
```

**No UI configuration options are being passed.**

---

## ⚠️ ROOT CAUSE ANALYSIS

### Problem Statement

1. **Chatbot auto-opens on load** - No option to prevent this
2. **Window renders partially off-screen** - No positioning control
3. **Cannot be closed properly** - No lifecycle hooks available
4. **CSS fixes are ineffective** - External script uses iframe/shadow DOM

### Why CSS Doesn't Work

- External embed script (`bot.js`) renders its own UI
- Likely uses iframe or Shadow DOM (isolated styling)
- Our CSS cannot penetrate the embed boundary
- Widget styling is controlled entirely by the RAG service

---

## ✅ REQUIRED ACTIONS

### Step 1: Inspect Actual Script (MANDATORY)

**Action:** Load `bot.js` in browser and inspect `window.initializeEducoreBot` function signature

**How to inspect:**
1. Open browser DevTools
2. Load page with chatbot
3. In Console, type: `window.initializeEducoreBot.toString()`
4. Check function parameters and available options

**Alternative:** Check Network tab → `bot.js` → View source → Search for function definition

### Step 2: Test Undocumented Options (If Found)

If inspection reveals undocumented options, test them:

```javascript
window.initializeEducoreBot({
  microservice: 'COURSE_BUILDER',
  userId: userProfile.id,
  token,
  tenantId: userProfile.company || 'default',
  // Test these if found in script:
  defaultOpen: false,
  autoOpen: false,
  collapsed: true,
  position: 'bottom-right'
})
```

### Step 3: Report Findings

**If UI options exist:**
- ✅ Update implementation to use them
- ✅ Document the options
- ✅ Test thoroughly

**If UI options DO NOT exist:**
- ❌ **STOP** trying to fix UX from our side
- 📝 **REPORT** clearly: "UI behavior is controlled entirely by the embed script"
- 💡 **PROPOSE** solutions:
  1. Request UI configuration API from RAG team
  2. Replace widget with iframe wrapper (if RAG provides iframe URL)
  3. Add explicit toggle API on RAG side

---

## 🎯 ACCEPTANCE CRITERIA

We consider this DONE only when:

- [ ] Chatbot is closed on load
- [ ] Only launcher icon is visible
- [ ] Clicking icon opens full chat
- [ ] Chat stays fully inside viewport
- [ ] Behavior is deterministic (no flicker)

**If the embed does not support this:**
- ✅ Say it clearly
- ✅ Do not fake a fix
- ✅ Document limitations
- ✅ Propose next steps

---

## 📝 Next Steps

1. **Immediate:** Inspect `bot.js` script for available options
2. **If options found:** Implement and test
3. **If no options:** Report to RAG team with clear requirements
4. **Document:** Update integration docs with findings

---

**Status:** ⏳ Pending script inspection

