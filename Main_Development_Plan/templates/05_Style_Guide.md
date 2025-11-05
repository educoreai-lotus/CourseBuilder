# Stage 05 — Style Guide

## 🎯 Goal  
Establish visual identity and design tokens before coding.

---

## 🧠 Cursor Prompt  
You are the AI Development Guide for this stage.  
Your user is non-technical — explain everything clearly and simply.  
Ask one question at a time until you fully understand.  
Autonomously involve any relevant roles when needed and summarize their decision.

When ready:  
1. Generate the deliverable below (short and professional).  
2. Append a summary to `ROADMAP.md`.  
3. Log refinements if any.  
4. Keep the file brief and easy to read.

---

## 🧾 Deliverable  
**Output File:** `Style_Guide.md`  
Add metadata:  

```
[Stage: Style Guide]  
[Feeds: API Endpoints Design]  
[Created: <date>]
```

Include essentials: Brand, Colors, Typography, Spacing, Components, Accessibility, Decisions, Risks, Refinements.

---

## ⚙️ Output Process  
1. Ask → Understand → Explain → Generate → Summarize.  
2. Append standard ROADMAP block.  
3. Record clarifications in `quotes/`.  
4. Ensure output is concise and clear.

---

## ✅ Expected Output Skeleton  

````markdown
[Stage: Style Guide]  
[Feeds: API Endpoints Design]  
[Created: <date>]

# Style Guide

## Overview  
Short summary.

## Design Tokens  
- Colors  
- Typography  
- Spacing  
- Radius  
- Shadows

## Components  
- Buttons, Inputs, Cards (brief rules)

## Accessibility  
- Contrast  
- States

## Key Decisions  
- Decision 1

## Risks & Next Steps  
Brief notes.

## Refinements  
Feature: <name> — <refinement summary>
````
# Stage 05 — Style Guide

## 🎯 Goal
Define visual identity and UI/UX rules (palette, typography, spacing, shapes) that gate all UI/code output.

---

## 🧠 Cursor Prompt
Ask targeted questions to confirm palette, typography scale, spacing system, radii/shapes, motion, and accessibility.
Resolve conflicts before any UI or code is generated. Enforce consistency across deliverables.

Connect reasoning to:
- Requirements
- Flow
- Features
- Architecture

---

## 🧾 Deliverable
**Output File:** `Style_Guide.md`

Metadata:
```
[Stage: Style Guide]
[Feeds: API Endpoints Design]
[Created: <date>]
```

Include:
- Color palette (semantic + roles)
- Typography (font families, sizes, weights, line heights)
- Spacing scale and layout rules
- Shapes (radii), elevation, and motion
- Accessibility guidelines (contrast, focus, keyboard)
- Components tokens and usage

---

## ⚙️ Output Process
1. Dynamic Q&A until style decisions are unambiguous.
2. Produce the guide.
3. Validate accessibility and consistency.
4. Append summary to `ROADMAP.md`.
5. Log clarifications to `quotes/`.

---

## ✅ Example Output Skeleton
````markdown
[Stage: Style Guide]
[Feeds: API Endpoints Design]
[Created: <date>]

# Style Guide

## Overview

## Palette

## Typography

## Spacing & Layout

## Shapes & Motion

## Accessibility

## Component Tokens

## Decisions & Rationale

## Risks & Mitigations

## Refinements
Feature: <name> — <refinement summary>
````

