[Stage: TDD Specification]
[Feeds: Development Roadmap]
[Created: 2025-11-04]

# TDD Plan and Specification — Course Builder

## Overview
Course Builder follows "Shift-Left Testing" — writing tests before code, automating validation across environments, and measuring quality continuously through CI/CD. TDD approach (Red → Green → Refactor) for all core logic.

## Test Strategy
- Unit Testing
  - Scope: Domain entities, business logic (CourseStructureService, PublishingService, FeedbackService, CredentialService, etc.)
  - Method: Pure TDD (Red → Green → Refactor); each unit test mocks external dependencies (DB, API clients, gRPC stubs)
  - Goal: Verify deterministic logic (course structure generation, metadata validation, versioning)
- Integration Testing
  - Scope: REST API endpoints and DB interactions via Supertest + PostgreSQL test container; covers controllers → services → repositories
  - Examples: POST /api/v1/courses → course created in DB; POST /api/v1/courses/:id/publish → triggers publishing workflow; POST /api/v1/courses/:id/feedback → stores feedback + updates analytics queue
  - Goal: Ensure complete functional paths work correctly together
- gRPC Testing
  - Scope: Validate gRPC contracts with mock servers for Content Studio, Assessment, and RAG
  - Approach: Use jest-grpc for client-side testing (mock responses); run schema validation (proto → compiled stub); test message serialization, token auth, and response parsing
- End-to-End (E2E)
  - Scope: Simulate learner and trainer flows through frontend → backend → mock microservices
  - Tool: Cypress with seeded test data (Vite React app)
  - Scenarios: Learner registers, completes lessons, takes test, submits feedback; Trainer creates and publishes a new course; Content Studio and Assessment interactions verified through mock APIs
  - Goal: Guarantee user journeys work end-to-end under realistic conditions
- Performance & Resilience
  - Tool: k6
  - Tests: Course listing and registration at 10k concurrent learners; gRPC latency for content generation < 500ms per request; DB throughput under load (read/write ops < 200ms)
  - Goal: Validate scalability and reliability

## Test Framework & Tools
- Unit Tests: Jest — Core logic, services, repositories, utils (TDD)
- Integration Tests: Supertest — REST endpoints (Express controllers)
- gRPC Tests: grpc-tools + jest-grpc — Validate inter-service contracts (Assessment, Content Studio, RAG)
- End-to-End (E2E): Cypress — Full learner/trainer workflow (frontend ↔ backend)
- Performance: k6 — Load tests for concurrency (10k+ learners)
- Security / Lint: ESLint + npm audit + OWASP ZAP (CI scan) — Static analysis and dependency security
- Coverage Reporting: Jest + Istanbul (nyc) — Enforce coverage targets
- CI/CD Integration: GitHub Actions + Railway CI — Auto-run tests on every push/merge

## Coverage Targets
- Core Logic (Domain & Services): ≥ 80% — Required minimum
- Controllers & Repositories: ≥ 75% — Functional coverage
- gRPC Clients & Integrations: ≥ 70% — External call mocks
- E2E Flows (Cypress): ≥ 60% — High-level user journey validation
- CI Gate Enforcement: Failing below thresholds blocks merge via GitHub Actions; coverage reports auto-uploaded to Codecov

## Unit Test Cases

All unit tests use Jest and follow TDD (Red → Green → Refactor). External dependencies (DB, gRPC, REST clients) are mocked using jest.fn() or nock.

### 1) InputService
**Purpose:** Handle and validate triggers from Learner AI, Marketplace, and Content Studio.

**Test Scenarios:**
- `receiveFromLearnerAI(payload)`: Valid payload → normalized successfully; Missing learning_path → throws ValidationError; Invalid learner ID format → rejected
- `receiveFromMarketplace(courseRef)`: Existing course → returns republish flag; New course → passes to CourseStructureService
- `receiveFromContentStudio(courseName)`: Valid trigger → generates correct internal event; Invalid courseName → logs and skips

**Edge Cases:** Null/empty payloads; Unrecognized trigger source; Duplicate marketplace courseRef

**Coverage Target:** 85% (High priority)

### 2) CourseStructureService
**Purpose:** Expand skills and build modular structure (Topics → Modules → Lessons).

**Test Scenarios:**
- `expandSkills(courseDescription)`: Calls Skills Engine API → returns micro-skills array; Handles Skills Engine timeout gracefully
- `buildStructure(skills)`: Generates correct hierarchy with valid order indexes; Missing skill list → returns empty structure
- Structural validation: Ensures no duplicate module IDs; Confirms each lesson belongs to a module

**Edge Cases:** Skill expansion returns empty array; Invalid skill schema; Circular module dependency detection

**Coverage Target:** 90% (Critical priority)

### 3) ContentDelegationService
**Purpose:** Send content generation requests to Content Studio and validate returned metadata.

**Test Scenarios:**
- `sendCourseData(courseInfo, skills, learnerContext)`: Builds correct gRPC request body; Retries once on gRPC network failure
- `validateLessonMetadata(lessons)`: Lesson prerequisites valid → passes; Missing metadata (language, duration) → throws MetadataValidationError

**Edge Cases:** Empty lessons array; Mismatched topic → lesson mapping; gRPC timeout (simulated via mock)

**Coverage Target:** 80% (High priority)

### 4) AIEnrichmentService
**Purpose:** Optional enrichment via YouTube/GitHub integrations.

**Test Scenarios:**
- `enrichWithYouTube(course)`: Returns video links and adds metadata tags; Handles API quota or 403 error → logs warning
- `enrichWithGitHub(course)`: Fetches repos/examples successfully; Invalid repo URL → skipped safely

**Edge Cases:** No enrichment enabled; API key invalid or expired; Empty course metadata

**Coverage Target:** 70% (Optional priority)

### 5) PublishingService
**Purpose:** Handle course publication scheduling and live updates.

**Test Scenarios:**
- `publishNow(course)`: Sets status → "live" and updates Marketplace client; Confirms database update success
- `schedulePublishing(course, datetime)`: Creates new version record with status = scheduled; Past date → throws InvalidScheduleError
- Retry Queue: Fails Marketplace push → adds to RetryQueue

**Edge Cases:** Missing course_id; Duplicate publish event; Schedule conflict (two active versions)

**Coverage Target:** 85% (High priority)

### 6) AssessmentService
**Purpose:** Redirect learners to Assessment and receive reports.

**Test Scenarios:**
- `startAssessment(learnerId, coverageMap)`: Valid learner → returns redirect link; Missing coverageMap → throws InvalidAssessmentError
- `receiveReport(report)`: Saves assessment data in DB; Invalid report schema → rejected gracefully

**Edge Cases:** Assessment service unreachable; Duplicate report callback; Invalid learner/course match

**Coverage Target:** 80% (High priority)

### 7) FeedbackService
**Purpose:** Collect and distribute learner feedback to Directory/Marketplace.

**Test Scenarios:**
- `collectFeedback(learnerId, courseId, feedback)`: Valid feedback → stored and returns ID; Invalid rating (<1 or >5) → ValidationError
- `distributeFeedback(courseId)`: Aggregates correctly and posts to DirectoryClient; Network failure → queued for retry

**Edge Cases:** Duplicate submission; Missing learner ID; Invalid tag schema

**Coverage Target:** 85% (High priority)

### 8) AnalyticsService
**Purpose:** Share course analytics and HR reports.

**Test Scenarios:**
- `sendLearningAnalytics(courseData)`: Sends correct payload with engagement metrics; Handles partial learner data (missing ratings)
- `sendHRReport(courseData)`: Builds HR-friendly summary (registered, active, completed); Fails → logs retry job

**Edge Cases:** Empty dataset; Incorrect completionRate format; Invalid token (OAuth refresh tested)

**Coverage Target:** 80% (Medium priority)

### 9) CredentialService
**Purpose:** Issue micro-credentials via Credly.

**Test Scenarios:**
- `issueCredential(learnerId, courseId, metadata)`: Builds correct REST payload → "issued" response; Handles duplicate issuance → ignored
- Error handling: Expired access token → retried after refresh; Invalid learner ID → logged as warning

**Edge Cases:** Credly service downtime; Missing skills in metadata; Credential API limit reached

**Coverage Target:** 75% (Medium priority)

### Testing Philosophy
Each unit test validates business logic in isolation. Failures in mocks or missing data should never block system orchestration but must raise structured warnings logged through the central Logger.

## Integration Test Cases

Integration tests verify that controllers, services, and repositories work together correctly — including REST APIs, gRPC contracts, and database operations (PostgreSQL). All tests use Jest + Supertest for REST and jest-grpc for gRPC interactions.

### 1) REST API Endpoints

#### A) Course Lifecycle
**Endpoints:** POST /api/v1/courses → GET /api/v1/courses/:id → POST /api/v1/courses/:id/publish

**Scenarios:**
- ✅ Create Course (200) — returns course_id, persists data in DB
- ⚠️ Missing fields (400) — course_name or trainer_id missing → validation error
- ✅ Get Course Details (200) — returns structure (topics, modules, lessons)
- ⚠️ Invalid ID (404) — non-existent course → "Course not found"
- ✅ Publish Course (200) — updates status to live and triggers MarketplaceClient mock
- ⚠️ Marketplace error (503) — simulated external service failure → retry queued

#### B) Learner Flow
**Endpoints:** GET /api/v1/courses (browse), POST /api/v1/courses/:id/register, POST /api/v1/courses/:id/feedback

**Scenarios:**
- ✅ Browse Courses (200) — pagination, sorting, filters (e.g., level, category)
- ✅ Register Learner (201) — creates record in registrations table
- ⚠️ Duplicate registration (409) — same learner/course pair → conflict error
- ✅ Submit Feedback (201) — creates feedback entry and updates analytics mock
- ⚠️ Invalid rating (400) — rating > 5 or < 1 → validation failure

#### C) Version & Feedback Analytics
**Endpoints:** GET /api/v1/courses/:id/versions, GET /api/v1/courses/:id/feedback/analytics

**Scenarios:**
- ✅ Version history retrieved with correct metadata
- ⚠️ Invalid course_id → 404
- ✅ Analytics endpoint aggregates ratings and tag averages from multiple feedbacks
- ⚠️ Empty dataset → returns zeros gracefully

### 2) gRPC Contracts

#### A) Course Builder ↔ Content Studio
**RPC:** ContentStudioService.GenerateLessons

**Scenarios:**
- ✅ Valid Request (200) — sends learner payload → mock returns lessons array
- ⚠️ Invalid learning_path — missing topic_id → gRPC INVALID_ARGUMENT
- ✅ Trainer Course Request — sends trainer payload → returns structured content
- ⚠️ Timeout (DEADLINE_EXCEEDED) — simulate network delay → handled with retry logic

#### B) Course Builder ↔ Assessment
**RPCs:** StartAssessment, SendReport

**Scenarios:**
- ✅ StartAssessment → returns redirect_url, validates coverage map
- ⚠️ Missing learner ID → INVALID_ARGUMENT
- ✅ Receive Report → stores in assessments table
- ⚠️ Duplicate report → ignored gracefully with log warning

#### C) Course Builder ↔ RAG
**RPC:** RAGService.PushCourseMetadata

**Scenarios:**
- ✅ Valid metadata → returns graph_node_id
- ⚠️ Invalid token → simulated UNAUTHENTICATED
- ✅ Retry on transient error (UNAVAILABLE) works via RetryQueue

### 3) Database Operations (PostgreSQL via Repositories)
**Tables:** courses, modules, lessons, registrations, feedback, assessments, versions

**Scenarios:**
- ✅ Create & Retrieve Course — inserted record retrievable by ID
- ✅ Cascade Save — course → modules → lessons persist transactionally
- ⚠️ Constraint Violations — invalid foreign key (module.course_id missing) → rollback works
- ✅ Version Increment — new version auto-increments correctly
- ✅ Feedback Aggregation — query joins return correct averages
- ⚠️ Concurrent Writes — simulate two updates → row-locking tested
- ✅ Soft Delete — DELETE /api/v1/courses/:id sets status to "archived" not removed

### 4) Error Handling & Edge Integration Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| External API failure (YouTube/GitHub/Credly) | Logs warning, does not break course creation |
| Invalid OAuth2 token | Returns 401 Unauthorized |
| Missing environment variable | Throws config error, prevents server start |
| Database disconnect | Auto-reconnect attempt, retries up to 3x |
| gRPC serialization error | Returns 500 + error message logged |

### 5) Validation of Data Exchange
- Verify JSON schema of requests/responses matches OpenAPI contract
- Validate proto messages compile and match proto/ definitions
- Confirm all numeric fields (ratings, progress, completionRate) have correct type conversions

### Coverage Goals

| Category | Target | Tools |
|----------|--------|-------|
| REST Endpoint Paths | ≥ 80% | Jest + Supertest |
| gRPC Contracts | ≥ 75% | jest-grpc |
| Database Operations | ≥ 85% | Jest + TestContainers |
| Error/Edge Handling | ≥ 70% | Jest mocks |

### Testing Philosophy
Integration tests confirm that every service, endpoint, and DB operation collaborates correctly in a real environment. Failures in external systems must be isolated — Course Builder should log, retry, and continue orchestration instead of crashing.

## Test Fixtures & Data

All tests (unit, integration, E2E) rely on consistent mock factories, seed data, and stubs to guarantee repeatable test runs. Fixtures are loaded via jest.setup.js or environment-specific scripts (/tests/fixtures/).

### 1) Mock Factories (Generated Objects)

Reusable object generators for unit & integration tests. Located under: `/tests/factories/`

| Factory | Fields | Purpose |
|---------|--------|---------|
| CourseFactory | id, title, description, level, trainer_id, skills, modules[], status | Create valid and invalid course payloads for REST and gRPC tests |
| ModuleFactory | id, course_id, title, order, metadata | Test nested structure persistence |
| LessonFactory | id, module_id, title, order, content_ref, language | Validate hierarchical saving and ordering logic |
| LearnerFactory | id, name, company_id, email, progress, rating | Generate learner entities for registration and feedback tests |
| TrainerFactory | id, name, organization, specialization | Mock authenticated trainers creating or publishing courses |
| FeedbackFactory | id, course_id, learner_id, rating, tags, comment | Simulate multiple feedback submissions and analytics calculations |
| AssessmentReportFactory | learner_id, course_id, score, result, coverage_map | Produce valid/invalid reports for AssessmentService callbacks |
| CredentialFactory | learner_id, course_id, skills, score, badge_id | Simulate issued badges from Credly for CredentialService tests |

### 2) Seed Data for Test DB

Static baseline data loaded into PostgreSQL test container before integration/E2E tests. Seed files located at `/tests/seed/` and executed via `npm run seed:test`.

| Table | Example Seed Data | Purpose |
|-------|-------------------|---------|
| courses | 2 demo courses (AI Fundamentals, Secure Coding Basics) | Validate creation, retrieval, and feedback aggregation |
| modules | 4 modules linked to seed courses | Check relational joins and ordering |
| lessons | 8 lessons across modules | Test lesson traversal and lesson_completion_dictionary |
| trainers | "John Trainer", "Aisha Expert" | Used for publishing and scheduling tests |
| learners | 5 learners from 2 companies | Used for registration, completion, and analytics reports |
| feedback | Ratings: [4, 5, 3] with tags (Clarity, Difficulty) | Test aggregation and analytics sync |
| assessments | 3 assessment records per learner | Validate reporting and credential logic |

**Purpose:** Ensures integration and E2E tests start from a consistent, known dataset replicating production conditions.

### 3) gRPC Mock Servers / Stubs

Mock implementations for inter-service contract testing. Located in `/tests/mocks/grpc/`.

| Service | Mocked RPCs | Behavior |
|---------|-------------|----------|
| ContentStudioService | GenerateLessons | Returns predefined lessons/exercises; configurable success/error delay |
| AssessmentService | StartAssessment, SendReport | Simulates redirect response and report callback with configurable scores |
| RAGService | PushCourseMetadata | Returns graph_node_id for valid metadata, errors on invalid token |

**Purpose:** Isolate Course Builder from external dependencies while testing full orchestration flows.

### 4) REST API Client Mocks

Uses nock or msw (Mock Service Worker) for REST client simulations. Located at `/tests/mocks/api/`.

| Client | Mocked Endpoints | Purpose |
|--------|------------------|---------|
| SkillsEngineClient | /api/v1/skills/expand | Returns micro-skills array or error simulation |
| MarketplaceClient | /api/v1/marketplace/publish | Tests publish/schedule flows |
| DirectoryClient | /api/v1/directory/feedback-sync | Confirms feedback distribution |
| AnalyticsClient | /api/v1/analytics/learning-data | Validates data formatting and token handling |
| HRClient | /api/v1/hr/course-report | Tests org-level summaries |
| CredlyClient | /api/v1/credly/issue | Returns badge IDs; handles expired token scenario |
| YouTubeAPI / GitHubAPI | /search or /repos endpoints | Mock for enrichment service testing |

### 5) Test Environment Variables

Loaded via `.env.test`:
- `DB_URL=postgres://localhost:5433/coursebuilder_test`
- `JWT_SECRET=test_secret`
- `GRPC_PORT=50055`
- `CONTENTSTUDIO_MOCK_HOST=localhost`
- `ASSESSMENT_MOCK_HOST=localhost`
- `CREDLY_MOCK_HOST=localhost`

**Purpose:** Prevents interference with production DB; enables independent test containers for integration and CI runs.

### 6) Utility Fixtures

| Fixture | Purpose |
|---------|---------|
| testLogger | Simplified in-memory logger replacing Winston; asserts logs and warnings |
| mockTokenProvider | Generates OAuth2/JWTs for mock inter-service auth validation |
| retryQueueMock | Records queued retry events (used in PublishingService & AnalyticsService tests) |
| configFixture | Loads dynamic environment setup before each test run |

### Testing Philosophy

Fixtures are treated as first-class citizens — every test must use a deterministic dataset, ensuring reproducibility across local, CI, and staging environments.

## CI/CD Integration

Workflow file: `.github/workflows/test.yml`

### Pipeline Overview

The pipeline runs automatically on every push and pull request to main or develop. It validates quality through four stages:
1. Code Quality & Dependencies — lint, formatting, dependency audit
2. Automated Tests — unit → integration → e2e
3. Security & Coverage Gates — enforce thresholds (≥ 80% core logic)
4. Reporting & Notifications — Codecov + Slack alerts

### Workflow Steps

#### Trigger
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

#### Job 1: Lint & Static Analysis
- Checkout repo (actions/checkout@v4)
- Setup Node 20 (actions/setup-node@v4)
- Install deps (`npm ci`)
- Lint & Format (`npm run lint && npm run prettier:check`)

**Purpose:** Catch syntax + style issues early (ESLint + Prettier)

#### Job 2: Unit Tests
- Run unit tests (`npm run test:unit -- --coverage`)
- Framework: Jest with mocks (repositories, API clients, gRPC stubs)
- Coverage Report: generated via jest --coverage
- Enforced thresholds (in jest.config.js):
```json
"coverageThreshold": {
  "global": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```
- ⛔️ Build fails if coverage < target

#### Job 3: Integration & gRPC Tests
- Setup PostgreSQL (harmon758/postgresql-action@v1, version 15, db: coursebuilder_test)
- Run integration tests (`npm run test:integration`)
- Tools: Supertest + jest-grpc + TestContainers
- Purpose: Validate REST/gRPC workflows & DB transactions
- Reports: JUnit XML → actions/upload-artifact

#### Job 4: Security & Dependency Scan
- Security scan (`npm audit --audit-level=moderate`)
- OWASP ZAP baseline scan (zaproxy/action-baseline@v0.10.0, target: http://localhost:3000)
- Checks vulnerable packages + OWASP Top 10 endpoints

#### Job 5: E2E (UI + Backend)
- Run Cypress E2E (cypress-io/github-action@v6)
- Starts: `npm run start:test`
- Waits on: `http://localhost:5173`
- Browser: chrome
- Environment: Spins up Vite frontend + mock services
- Purpose: Simulate full learner/trainer journey

#### Job 6: Coverage & Reports
- Upload coverage to Codecov (codecov/codecov-action@v4)
- Token: `${{ secrets.CODECOV_TOKEN }}`
- Files: `./coverage/lcov.info`
- Combines Jest + Cypress coverage
- Fails build if thresholds < 80% core logic or 70% overall
- Posts status checks to GitHub PR

#### Job 7: Notifications
- Slack Notify (8398a7/action-slack@v3)
- Status: `${{ job.status }}`
- Fields: repo, commit, author, job, elapsed
- Webhook: `${{ secrets.SLACK_WEBHOOK_URL }}`
- Purpose: Notify dev team on failures or success
- Recipients: #coursebuilder-ci channel

### Post-Test Reporting

- Artifacts: JUnit XML + Coverage LCOV uploaded per run
- Dashboard: Codecov shows file-level coverage trends
- Retention: 14 days for logs + artifacts
- PR Gates: PR blocked if lint fails, tests fail, or coverage < threshold; Code owners receive auto review request on failed checks

### Security & Secrets Management

- Test secrets stored in GitHub Secrets: `DB_URL_TEST`, `CODECOV_TOKEN`, `SLACK_WEBHOOK_URL`, `JWT_SECRET_TEST`
- No production tokens used
- Secrets rotated automatically every 90 days

### Philosophy

CI/CD testing follows "fail-fast, report-clearly": small atomic jobs, isolated environments, and immediate feedback to developers. Every commit must pass lint + tests + coverage before merge to main.

## Decisions & Rationale
- TBD

## Risks & Next Steps
- TBD

## Refinements
- Feature: TBD — TBD

