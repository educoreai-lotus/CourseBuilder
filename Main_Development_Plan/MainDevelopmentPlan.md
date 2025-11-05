# Main Development Plan System (v12)

## Purpose
A concise, professional plan to guide any software project from vision to implementation.

## How It Works
- Ask one question at a time in plain language.
- Keep outputs brief and professional (200–300 lines max per file).
- After each stage, append a summary block to `ROADMAP.md` and log refinements.

## Files
- `templates/` contain stage guides with a built-in Cursor Prompt.
- `quotes/` logs clarifications (global and per-feature).

## Professional Output Rules
- Use proper Markdown hierarchy.
- Be concise, avoid jargon, and explain choices simply.
- Align logic with requirements and style guide.
- Ask before generating large code sections.

## Standard ROADMAP Block
Append after each stage:

### Stage <#> — <Stage Name>

✅ Completed: <one-line summary>

💡 Key Decisions:
- <Decision 1>

🧩 Feature Refinements:
- <Feature>: <short note>

## Refinement Logging
- Global → `quotes/global_refinements.quotes.md`
- Feature-specific → `quotes/<feature>.quotes.md`

Start at Stage 01 (`templates/01_Project_Initialization.md`).
# Main Development Plan — System Instructions

Purpose: Provide a dynamic, professional, requirement-aligned plan that drives questioning, design validation, implementation, and refinement logging.

Global Rules:
- Dynamic questioning: ask only what’s missing; proceed once sufficient.
- Role autonomy: invoke Architect, Dev, QA, PM, Designer, DevOps, Security as needed; keep dialogue concise; record decisions.
- Style-first: finalize Style Guide before code; validate colors, spacing, typography, components.
- Roadmap management: after each stage, append results to `ROADMAP.md` using the prescribed format.
- Refinements: log globally in `quotes/global_refinements.quotes.md` and per-feature in `quotes/<feature>.quotes.md`.
- Code verification: confirm compliance with requirements and style; if uncertain, ask.
- No extra files: only produce artifacts in this structure.

How to Use Templates:
1) Open the relevant file in `templates/`.
2) Ask dynamic, context-aware questions until you can complete the deliverable.
3) Produce the deliverable sections in that template file.
4) Append the stage summary to `ROADMAP.md`.
5) Log refinements in `quotes/` when clarifications occur.
### Main Development Plan System (v8: Dynamic + Style-First)

Purpose: Generate a complete, professional development plan with dynamic, style-first stages. Each stage template drives an adaptive Q&A and produces a finalized deliverable.

Core behavior:
- Ask one question at a time; adapt dynamically until requirements are clear.
- Prioritize design and UX before implementation.
- Log refinements globally or per feature and reflect them in the roadmap.

Usage:
1) Start with `templates/01_Project_Initialization.md` and proceed sequentially.
2) Each template contains a role prompt, dynamic questioning guidance, and output steps.
3) After a stage, update `ROADMAP.md` as instructed by the template.

Files:
- See `MANIFEST.md` for a complete index.


