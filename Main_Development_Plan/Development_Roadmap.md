[Stage: Development Roadmap]
[Feeds: Testing & QA]
[Created: 2025-11-04]

# Development Roadmap — Course Builder v1

## Overview
2-week MVP sprint to deliver a functional Course Builder with backend orchestration, basic frontend, and mock integrations. Priority on MVP functionality, not full polish.

## Milestones & Timeline

**Target Duration:** 2 Weeks (14 Days)  
**Sprints:** 2 × 1-week mini-sprints

### Sprint 1 (Week 1) — Backend MVP
**Focus:** Core microservice foundation and API functionality.

**Milestones:**
- Setup & Environment
  - Node.js + Express backend initialized on Railway
  - PostgreSQL schema created (courses, modules, lessons, feedback, versions)
- Core API Endpoints
  - /api/v1/courses (create, get, publish)
  - /api/v1/courses/:id/register (learner registration)
  - /api/v1/courses/:id/feedback (feedback collection)
- gRPC Client Stubs
  - Connect mock Content Studio + Assessment services
  - Test personalized and trainer course payloads
- Security
  - OAuth2 + JWT auth middleware (RBAC for trainer/learner)
- Unit + Integration Tests
  - Jest + Supertest coverage ≥ 80% for core services

**Deliverable:** ✅ Backend MVP deployed on Railway with mock inter-service connections.

### Sprint 2 (Week 2) — Frontend + Integration + QA
**Focus:** UI, integration, and full user journey validation.

**Milestones:**
- Frontend MVP (Vite + React)
  - Core pages: Home, Courses, Lessons, Feedback
  - Trainer Dashboard: Create / Publish course
  - Learner Dashboard: Register / Study / Rate course
  - Theme toggle (light/dark, logo switch)
- Integration
  - Connect backend REST endpoints and mock gRPC results
  - Simulate data flow: Course Builder ↔ Content Studio ↔ Assessment
  - Send analytics payload to mock Learning Analytics & HR
- Testing & QA
  - Integration + E2E tests (Cypress, k6 performance)
  - Code coverage review
- Deployment & Review
  - Frontend → Vercel
  - Final backend sync with Railway PostgreSQL
  - MVP demo run (trainer → learner → feedback loop)

**Deliverable:** ✅ Fully functional MVP (frontend + backend), integrated and demo-ready.

### Key Milestones

| Milestone | Deliverable | Owner | Target Date |
|-----------|-------------|-------|-------------|
| M1 | Backend MVP Ready (API + DB + Tests) | Dev Team | End of Week 1 |
| M2 | Frontend MVP Ready (UI + Hooks + API integration) | Frontend | Mid Week 2 |
| M3 | Integration Complete (gRPC + REST + Mock Data) | Fullstack | End of Week 2 |
| M4 | MVP Demo / Production Prep | Architect | End of Week 2 |

## Workstreams
- Backend Development: Week 1 (Sprint 1) — Core services, API endpoints, DB schema, gRPC stubs
- Frontend Development: Week 2 (Sprint 2) — React UI, pages, trainer/learner dashboards
- Integration & Testing: Week 2 (Sprint 2) — API connections, E2E tests, mock service orchestration
- DevOps & Deployment: Continuous — Railway backend, Vercel frontend, CI/CD pipeline

## Task Breakdown

### Sprint 1 — Backend (Week 1)

**Goal:** Deliver a fully functional backend MVP with APIs, DB schema, and mock gRPC integrations.

| Module / Feature | Tasks | Est. Effort |
|------------------|-------|-------------|
| 1. Setup & Configuration | Initialize Node.js + Express project structure; Configure .env, security config, logger; Connect PostgreSQL (Supabase / Railway); Setup Jest + Supertest | 6h |
| 2. Domain Models & DB Schema | Define entities: Course, Module, Lesson, Feedback, Version, Assessment, Registration; Create migrations & seed test data; Add foreign key + ENUM constraints | 8h |
| 3. InputService | Implement handlers for LearnerAI and Marketplace triggers; Validate incoming payloads; Add mock LearnerAI REST endpoint | 6h |
| 4. CourseStructureService | Build expandSkills() and buildStructure() logic; Mock Skills Engine client; Unit tests for validation + ordering | 8h |
| 5. ContentDelegationService | Implement gRPC request to Content Studio mock; Add payload structure for personalized and trainer course modes; Mock Content Studio responses | 6h |
| 6. PublishingService | Implement publishNow() and schedulePublishing(); Integrate MarketplaceClient mock; Add RetryQueue mechanism | 6h |
| 7. FeedbackService | Add collectFeedback() + distributeFeedback() logic; Mock DirectoryClient for feedback sync; Validation for rating range + tags | 5h |
| 8. AssessmentService | Add startAssessment() (gRPC call); Add receiveReport() callback handling + DB persistence | 5h |
| 9. AnalyticsService | Build payload for /analytics/learning-data and /hr/course-report; Mock REST calls; Add log-based verification | 5h |
| 10. CredentialService | Add issueCredential() integration with mock Credly REST; Handle token refresh + error retries | 4h |
| 11. Auth & Security Middleware | Implement OAuth2 + JWT token checks; Add RBAC roles (trainer, learner, admin); Test protected routes | 5h |
| 12. Unit + Integration Tests | Write Jest tests per service (≥ 80% coverage); Run Supertest for core endpoints | 10h |
| 13. CI Setup | Add GitHub Actions lint/test pipeline; Configure coverage gate enforcement | 4h |

**Total Estimated Effort:** ~73h (≈ 9 developer-days)

**Deliverable:** ✅ Backend MVP live on Railway with tested REST/gRPC endpoints and PostgreSQL schema.

### Sprint 2 — Frontend + Integration (Week 2)

**Goal:** Build functional React interface, connect backend APIs, and complete full learner/trainer workflow.

| Module / Feature | Tasks | Est. Effort |
|------------------|-------|-------------|
| 1. Project Setup | Initialize Vite + React + Tailwind; Configure router, context provider, and API service layer | 4h |
| 2. Global Layout & Header | Implement Header with logo switch (light/dark mode); Add navigation: Home, Courses, Lessons; Theme toggle + role-based nav links | 5h |
| 3. HomePage | Build hero + feature sections; "Browse Courses" & "View Lessons" CTA routing | 4h |
| 4. Course Pages | /courses list view (fetch from backend); /courses/:id detail view with modules + lessons | 8h |
| 5. Trainer Dashboard | Course creation modal; Publish / Schedule controls; Feedback analytics chart placeholders | 8h |
| 6. Learner Flows | Course registration form; Lesson viewer (mock content data); Feedback submission UI | 8h |
| 7. API Integration | Connect all REST endpoints (/courses, /feedback, /register); Handle JWT tokens via context; Mock gRPC results for Content Studio + Assessment | 6h |
| 8. State Management | Implement global store (React context or Zustand); Persist session + theme | 4h |
| 9. Styling & Responsiveness | Apply Style Guide tokens (gradients, spacing, radius); Tailwind adjustments for breakpoints | 6h |
| 10. Testing (Cypress + Jest) | E2E learner flow: register → learn → test → feedback; Trainer flow: create → publish → view analytics; Verify all API integrations | 10h |
| 11. Deployment & QA | Deploy frontend to Vercel; Verify environment variables; Manual QA walkthrough (trainer + learner) | 4h |

**Total Estimated Effort:** ~67h (≈ 8 developer-days)

**Deliverable:** ✅ Integrated frontend–backend MVP deployed to Vercel/Railway with full user flows and mock service orchestration.

### Summary of Effort

| Sprint | Focus | Effort (hours) | Outcome |
|--------|-------|----------------|---------|
| Sprint 1 | Backend foundation + services + tests | ~73h | API + DB + mocks live |
| Sprint 2 | Frontend UI + integration + QA | ~67h | Functional MVP demo-ready |

**Total MVP Effort:** ~140h (≈ 17 developer-days)

## Constraints & Notes
- Timeboxed 2 weeks total — priority on MVP functionality, not full polish
- Mock data and stubs acceptable for non-critical microservices (Content Studio, Assessment)
- QA and deployment occur continuously — no dedicated QA sprint
- All code merged to develop branch daily; main locked until MVP verified
- Prioritize core functionality: creation → publication → feedback → analytics loop
- Lower-priority: advanced enrichment (YouTube, GitHub) and real microservice connectivity can be mocked
- Daily commits and merges to develop branch
- Continuous testing via GitHub Actions pipeline

## Dependencies

### Key Dependencies

| Category | Dependency | Description | Impact if Delayed | Mitigation |
|----------|------------|-------------|-------------------|------------|
| Internal | Content Studio (gRPC) | Needed for personalized/trainer course data | Personalized content unavailable | Use mock gRPC server with static payloads until integration |
| Internal | Assessment Service (gRPC) | Required for "Take Test" redirect + report callback | Blocks learner completion flow | Use local stub to simulate start/report methods |
| Internal | Learning Analytics & HR APIs | Receives engagement and completion metrics | Analytics dashboards delayed | Send payloads to mock REST endpoints + verify schema |
| Internal | Directory Service (REST) | Feedback visibility for learners/trainers | Directory ratings delayed | Use internal cache + push later |
| External | Railway (Backend Deployment) | Primary backend hosting | Backend downtime halts testing | Local Docker fallback + daily backups |
| External | Vercel (Frontend Deployment) | Frontend hosting and environment sync | UI unavailable for demos | Keep local dev server fallback |
| External | Supabase / PostgreSQL | Database storage | Schema or connectivity issues block persistence | Initialize backup local Postgres container |
| External | Credly API (REST) | Badge issuance post-assessment | Credential flow incomplete | Mock CredlyClient with static response |
| External | OAuth2 Authorization Server | Token generation between microservices | Inter-service auth fails | Generate local static JWT for testing |
| Tooling | GitHub Actions / CI-CD | Test + deploy automation | Manual testing only if pipeline fails | Run tests locally before merge |
| Frontend | Tailwind + React Context APIs | Required for UI theming and state | Styling inconsistencies | Lock versions; predefine tokens |

## Risks & Mitigations

### Main Risks and Mitigations

| Risk | Description | Probability | Impact | Mitigation |
|------|-------------|------------|--------|------------|
| Tight 2-week timeline | Limited time for full backend + frontend polish | High | High | Focus on core MVP flow only (create → publish → feedback) |
| gRPC setup complexity | Proto compilation and service mocks can cause delays | Medium | High | Pre-generate stubs and use jest-grpc mocks early |
| Database migration issues | Schema or relation errors in Supabase | Medium | High | Use db:seed:test daily, commit schema.sql snapshot |
| Frontend integration lag | API changes may break frontend | Medium | Medium | Maintain shared Postman collection + JSON schema tests |
| Testing overhead | Unit/integration coverage targets may slip | Medium | Medium | Parallelize testing per service; run nightly CI job |
| OAuth token expiration | Mock tokens expiring mid-test run | Low | Medium | Use fixed test secret and extend TTL during MVP |
| External API limits (YouTube/GitHub) | Enrichment APIs might throttle | Low | Low | Keep enrichment off by default in MVP |
| Deployment sync errors | Railway ↔ Vercel env variable mismatch | Medium | Medium | Store .env.shared.json for synchronized config |
| Team context switching | Backend and frontend tasks overlap | Medium | Medium | Daily 15-min standups + shared task board (Notion/Trello) |
| CI/CD Pipeline failure | GitHub Actions misconfigurations or token issues | Low | Medium | Local fallback: npm run test:all before push |

### Risk Priority Matrix

| Severity | Example Risks |
|----------|---------------|
| 🔴 Critical | Tight schedule, DB schema or gRPC misalignment |
| 🟠 High | Integration mismatches, deployment errors |
| 🟡 Moderate | API limits, testing coverage dips |
| 🟢 Low | Styling inconsistencies, enrichment delays |

### Contingency Plan

- If backend delays occur → Frontend uses mock JSON API responses (local /mockData/*.json)
- If frontend slips → Deliver backend API demo and Postman tests for verification
- Daily standups track blockers; escalate critical issues within 12 hours
- Code freeze on Day 13, final QA and deploy on Day 14

### Summary

The MVP depends on stable mocks for gRPC and REST integrations. Main risk is timeline compression — mitigated by strict prioritization, daily CI checks, and mock-first strategy.

## Decisions & Rationale
- **2-week MVP timeline**: Prioritizes core functionality over polish; enables rapid validation and stakeholder feedback
- **Mock-first strategy**: Use mock gRPC/REST services to unblock development and avoid external dependency delays
- **Continuous deployment**: Daily merges to develop branch with automated CI/CD ensures incremental progress and early bug detection
- **Parallel workstreams**: Backend and frontend can progress simultaneously with API contracts as handoff points
- **Code freeze on Day 13**: Allows final QA and deployment on Day 14 without last-minute changes

## Refinements
- Feature: TBD — TBD

