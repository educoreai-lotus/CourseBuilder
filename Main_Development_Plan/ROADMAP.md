# ROADMAP

This file is updated after each stage using the standard block below.

Append this block per stage completion:

### Stage <#> — <Stage Name>

✅ Completed: <one-line summary>

💡 Key Decisions:
- <Decision 1>

🧩 Feature Refinements:
- <Feature>: <short note>

Refinement logs:
- Global → `quotes/global_refinements.quotes.md`
- Feature → `quotes/<feature>.quotes.md`
# Unified Project ROADMAP

This file is the single source of truth for stage progress and feature refinements.
Append the following block after completing each stage.

Format:

```
### Stage <#> — <Stage Name>
✅ Completed: <short summary>
💡 Key Decisions:
- <Decision 1>
- <Decision 2>
🧩 Feature Refinements:
- <Feature>: <short refinement summary>
```

Entries will be appended by Cursor as stages complete.
# Unified Roadmap

This file aggregates stage completions, key decisions, and feature refinements.

Append entries exactly as:

### Stage <#> — <Stage Name>
✅ Completed: <short summary>
💡 Key Decisions:
- <Decision 1>
- <Decision 2>
🧩 Feature Refinements:
- <Feature>: <short refinement note>

Refinement log format:
Refinement #<N> [Stage <#>]: <short description>
### ROADMAP — Single Source of Truth

Guiding principles:
- Record stage completion, key decisions, and refinements.
- Log refinements globally or per feature in `quotes/`.
- Keep entries concise and decision-focused.

How to update after each stage:
1) Add a Stage section with: Completed status, Key Decisions, and Feature Refinements.
2) For clarifications: append a quote to `quotes/global_refinements.quotes.md` or `quotes/<feature>.quotes.md`.
3) Ensure the next stage’s inputs (Feeds) are clear.

Example format:

#### Stage 05 — Style Guide
✅ Completed: Defined brand colors and UI tone.
🎨 Visual Decisions:
- Primary: #1E90FF
- Secondary: #202A3C
- Typography: Inter, medium spacing
🧩 Feature Refinements:
- Buttons: Rounded corners, hover color accent.
- Navbar: Sticky, 80% opacity on scroll.

---

#### Stage 01 — Project Initialization
- Status: ⏳ Pending

#### Stage 02 — Requirements & Scoping
- Status: ⏳ Pending

#### Stage 03 — Architecture Design
- Status: ⏳ Pending

#### Stage 04 — Security & Compliance
- Status: ⏳ Pending

#### Stage 05 — Style Guide
- Status: ⏳ Pending

#### Stage 06 — API Endpoints Design
- Status: ⏳ Pending

#### Stage 07 — TDD Specification
- Status: ⏳ Pending

#### Stage 08 — Development Roadmap
- Status: ⏳ Pending

#### Stage 09 — Feature Implementation
- Status: ⏳ Pending

#### Stage 10 — Testing & QA
- Status: ⏳ Pending

#### Stage 11 — Feature Prompt Refinements
- Status: ⏳ Pending

#### Stage 12 — Success Metrics
- Status: ⏳ Pending


### Stage 01 — Project Initialization
✅ Completed: Created charter skeleton and initialized refinement log.

💡 Key Decisions:
- TBD

🧩 Feature Refinements:
- Global: Initialization placeholders added; pending stakeholder inputs.

### Stage 02 — Requirements & Scoping
✅ Completed: Captured v1 requirements, flows, NFRs, and clarifications.

💡 Key Decisions:
- TBD

🧩 Feature Refinements:
- Global: Marketplace visibility flags; summary assessment storage; single React app routes; OAuth2+RBAC scope.

### Stage 03 — Architecture Design
✅ Completed: Defined system context, components, data model, workflows, security, observability, and risks.

💡 Key Decisions:
- Onion Architecture separation; immutable versioning; OAuth2 + RBAC security-first; direct REST/gRPC integrations for MVP.

🧩 Feature Refinements:
- Global: System boundaries finalized; service modules, routes, and DB schema defined; 6 architectural risks identified with mitigations.

### Stage 05 — Style Guide
✅ Completed: Initialized UI style guide skeleton (tokens, components, layouts, a11y).

💡 Key Decisions:
- TBD

🧩 Feature Refinements:
- Global: To be captured as visual decisions are finalized.

### Stage 06 — API Endpoints Design
✅ Completed: Defined all REST and gRPC endpoints (Learner, Trainer/Admin, and 7 internal service integrations).

💡 Key Decisions:
- REST for most services; gRPC for Content Studio, Assessment, and RAG; OAuth2 client-credentials for service-to-service auth.

🧩 Feature Refinements:
- Global: 13 public endpoints (6 learner, 7 trainer/admin); 7 internal service integrations with full request/response schemas and scopes.

### Stage 07 — TDD Specification
✅ Completed: Defined comprehensive test strategy, unit/integration/E2E cases, fixtures, and CI/CD pipeline.

💡 Key Decisions:
- TDD-first approach (Red → Green → Refactor); Jest + Supertest + jest-grpc + Cypress; ≥80% core logic coverage enforced via CI gates.

🧩 Feature Refinements:
- Global: 9 service modules with unit tests; REST/gRPC/DB integration coverage; GitHub Actions 7-job pipeline with Codecov + Slack notifications.

### Stage 08 — Development Roadmap
✅ Completed: Defined 2-week MVP timeline with Sprint 1 (backend) and Sprint 2 (frontend + integration), task breakdown, dependencies, and risk mitigations.

💡 Key Decisions:
- 2-week MVP with mock-first strategy; continuous deployment; parallel backend/frontend workstreams; code freeze on Day 13.

🧩 Feature Refinements:
- Global: 24 tasks across 2 sprints (~140h total effort); 11 dependencies identified with mitigations; 10 risks prioritized with contingency plans.

### Stage 09 — Feature Implementation
✅ Completed: Created implementation tracker template with 20 features/services for progress tracking during development.

💡 Key Decisions:
- Tracker-based approach for monitoring implementation progress; status options: Not Started, In Progress, Complete, Blocked.

🧩 Feature Refinements:
- Global: 20-tracker template ready for Sprint 1 & 2 updates; includes backend services, frontend UI, testing, and deployment items.

### Stage 04 — Security & Compliance
✅ Completed: Documented GDPR controls, IAM, encryption, logging/monitoring, and incident response.

💡 Key Decisions:
- GDPR-first approach (rights, DPAs, audit trails); Vault KMS with 90-day key rotation; short-lived tokens with RBAC scopes.

🧩 Feature Refinements:
- Global: Data classification and retention; erasure workflow; admin override auditing; SIEM-ready logs.

