[Stage: Architecture Design]
[Feeds: Security & Compliance, API Endpoints Design]
[Created: 2025-11-03]

# Architecture Design — Course Builder

## System Context
- Course Builder — Core orchestrator that builds, enriches, validates, and publishes modular courses based on inputs from Learner AI or Content Studio.
- Learner AI — Sends personalized learning paths and skill sets to initiate automatic course generation.
- Content Studio — Provides lesson and exercise content (via gRPC) based on structure, path, and context from Course Builder.
- Assessment — Delivers exams; receives coverage data and returns assessment reports and scores.
- Learning Analytics — Receives engagement, progress, and assessment data for analysis and reporting.
- Management Reporting — Receives summarized participation data (registered, active, completed learners) for training tracking.
- Directory — Logs learner registration and stores feedback ratings linked to course versions for org-wide visibility.
- Credly — Issues digital badges/micro‑credentials based on completion and performance data.
- RAG (Contextual Assistant) — Uses course metadata to enrich the knowledge graph and support contextual assistance.
- Mini‑Marketplace (Internal Module) — Local catalog where trainers publish validated courses and learners discover/register.

## Service Boundaries & Responsibilities
- Course Builder
  - Orchestrate triggers, structure generation, enrichment, validation, publishing, registration, progress, feedback, and data distribution.
- Learner AI
  - Provide learning path + skills payloads; does not manage content or publishing.
- Content Studio
  - Generate lessons/exercises via gRPC based on provided structure and context; no publishing logic.
- Assessment
  - Provide tests; accept redirect with coverage data; return assessment results.
- Learning Analytics
  - Consume analytics events and reports; no direct course mutation.
- Management Reporting
  - Consume summarized participation metrics; no learner PII beyond allowed fields.
- Directory
  - Maintain learner identity mappings; store feedback ratings by course version.
- Credly
  - Receive credential issuance requests; manage badge lifecycle externally.
- RAG
  - Consume metadata for knowledge graph enrichment; optional for publishing path.
- Mini‑Marketplace
  - Expose internal catalog views and registration; visibility governed by course/version flags.

## High-Level Components
- Backend (Node.js + Express on Railway)
  - InputService — Handles triggers from Learner AI and Content Studio; normalizes payloads; starts orchestration.
  - CourseStructureService — Builds modular structures (Topics → Modules → Lessons); manages versioning.
  - ContentDelegationService — Sends structure/context to Content Studio via gRPC; receives/validates lessons/exercises.
  - AIEnrichmentService — Enriches course metadata with AI tags/classifications; optional YouTube/GitHub enrichment.
  - PublishingService — Immediate or Scheduled publishing to internal mini‑marketplace.
  - AssessmentService — Redirects learners; sends coverage map; receives assessment report.
  - FeedbackService — Collects/stores learner feedback; shares with Directory and Learning Analytics.
  - AnalyticsService — Sends progress/completion to Learning Analytics; summarized participation to Management Reporting.
  - CredentialService — Sends credential issuance requests to Credly.
  - Security & Middleware — OAuth2 token validation, RBAC, centralized error handling/logging.

- Frontend (React ES6 + Vite + Tailwind on Vercel)
  - Learner Portal
    - /learner/dashboard — Personalized and enrolled courses overview
    - /learner/personalized — AI‑assigned courses
    - /learner/enrolled — Enrolled courses with progress
    - /course/:id — Course structure and enriched lessons
    - /course/:id/assessment — Redirect to Assessment
    - /course/:id/feedback — Submit feedback/ratings
  - Trainer Portal
    - /trainer/dashboard — Courses to validate/publish
    - /trainer/course/:id — Validate structure and enrichment
    - /trainer/publish/:id — Configure Immediate or Scheduled publish
    - /trainer/feedback/:id — Review feedback and engagement
  - Shared components: Navbar.jsx, CourseCard.jsx, CourseTreeView.jsx, LessonViewer.jsx, FeedbackForm.jsx, PublishControls.jsx

- Database (PostgreSQL on Supabase)
  - courses (id, name, description, metadata, visibility, created_at)
  - modules (id, course_id, name, order, metadata)
  - lessons (id, module_id, name, order, content_ref, enrichment_data)
  - versions (id, course_id, version_no, status, created_at)
  - registrations (id, course_id, learner_id, progress)
  - feedback (id, course_id, learner_id, rating, tags, comment)
  - assessments (id, learner_id, course_id, score, coverage_map, completion_date)

- Integration Adapters / API Clients
  - LearnerAIClient (REST) — Receive learning paths and skills
  - ContentStudioClient (gRPC) — Send structure/context; receive lessons/exercises
  - AssessmentClient (gRPC) — Send coverage; receive report
  - AnalyticsClient (REST) — Send progress and completion data
  - ManagementReportingClient (REST) — Send summarized participation
  - DirectoryClient (REST) — Share registration and feedback events
  - CredlyClient (REST) — Credential issuance
  - RAGClient (gRPC) — Share metadata for knowledge enrichment
  - YouTubeAPI / GitHubAPI — Optional enrichment for videos and code resources

## Data Model (Core Entities)
- courses
  - course_id UUID PK — immutable across lifecycle
  - course_name TEXT
  - course_description TEXT
  - level ENUM(beginner, intermediate, advanced)
  - duration INTEGER
  - visibility ENUM(private, public, scheduled)
  - status ENUM(draft, live, archived)
  - average_rating DECIMAL(2,1)
  - total_enrollments INTEGER
  - active_enrollments INTEGER
  - completion_rate DECIMAL(5,2)
  - created_at TIMESTAMP
  - trainer_id UUID FK → Directory/User
  - metadata JSONB (AI tags, enrichment info)
  - Rules: course_id immutable; only latest published version visible in marketplace

- versions
  - version_id UUID PK
  - course_id UUID FK → courses.course_id
  - version_no INTEGER (sequential)
  - status ENUM(draft, validated, published, archived)
  - scheduled_at TIMESTAMP nullable
  - created_at TIMESTAMP
  - Rules: new row on any structural/metadata change; older versions immutable (read‑only)

- modules
  - module_id UUID PK
  - course_id UUID FK → courses.course_id
  - name TEXT
  - order INTEGER
  - metadata JSONB (tags, prerequisites)

- lessons
  - lesson_id UUID PK
  - module_id UUID FK → modules.module_id
  - lesson_name TEXT
  - content_type ENUM(text, video, exercise, presentation)
  - content_data JSONB
  - micro_skills JSONB
  - nano_skills JSONB
  - devlab_exercises JSONB (refs to external exercises)
  - enrichment_data JSONB (AI metadata; YouTube/GitHub refs)

- registrations
  - registration_id UUID PK
  - course_id UUID FK → courses.course_id
  - learner_id UUID (Auth)
  - learner_name TEXT
  - learner_company TEXT
  - progress DECIMAL(5,2)
  - status ENUM(in_progress, completed, failed)
  - created_at TIMESTAMP

- feedback
  - feedback_id UUID PK
  - course_id UUID FK → courses.course_id
  - learner_id UUID
  - rating DECIMAL(2,1)
  - tags JSONB
  - comment TEXT
  - created_at TIMESTAMP
  - Rules: one feedback per learner per course version; immutable once submitted

- assessments
  - assessment_id UUID PK
  - course_id UUID FK → courses.course_id
  - learner_id UUID
  - coverage_map JSONB
  - grade DECIMAL(5,2)
  - test_result ENUM(pass, fail)
  - completion_date TIMESTAMP

Versioning & Immutability
- course_id, module_id, lesson_id remain stable; changes create a new versions row
- feedback and assessments link to the version active at submission time
- Only latest published version is visible in the internal marketplace

## Workflows (Sequence/Activity Summaries)
1) AI‑Personalized Course Flow (Learner AI Trigger)
 - Trigger Reception (REST)
   - From: Learner AI → Data: learner_id, learner_name, learner_company, skills[] (learning path)
   - Action: InputService.receiveFromLearnerAI() normalizes payload and starts orchestration
 - Structure Generation (Internal)
   - Service: CourseStructureService builds Topics → Modules → Lessons; allocates course_id
 - Content Request (gRPC)
   - To: Content Studio → Data: course_id, course_name, course_description, learner_id, learner_name, learner_company, skills[]
   - Action: Request personalized lessons/exercises
 - Receive Content (gRPC)
   - From: Content Studio → Data: lesson_id, lesson_name, content_type, content_data, micro_skills, nano_skills, devlab_exercises
   - Action: Store lessons; invoke AIEnrichmentService
 - AI Enrichment (Internal)
   - Add metadata/tags and optional YouTube/GitHub resources → update lessons.enrichment_data, courses.metadata
 - Validation & Storage (Internal + DB)
   - Validate structure/prerequisites; persist courses/modules/lessons/versions
 - Publishing (Internal Mini‑Marketplace)
   - Condition: If not personalized → PublishingService.publishNow() sets visibility='public', status='live'
 - Assessment Integration (gRPC)
   - To: Assessment → Data: course_id, learner_id, coverage_map; returns grade, test_result
 - Credential Issuance (REST)
   - To: Credly → Data: learner_id, course_id, grade, completion_date
 - Data Sharing (REST)
   - To: Management Reporting (summary metrics) and Learning Analytics (engagement, feedback, completion)

2) Trainer‑Driven Course Flow (Content Studio Trigger)
 - Trigger Reception (gRPC)
   - From: Content Studio → Data: course_id, course_name, course_description, trainer_id, lesson_id, lesson_name, micro_skills, nano_skills, content_type, content_data
 - Structure Validation (Internal)
   - Service: CourseStructureService validates structure, lesson consistency, skills
 - AI Enrichment (Internal)
   - Add metadata/tags and YouTube/GitHub enrichment
 - Storage (DB)
   - Persist entities; create new versions.version_no
 - Trainer Review (Frontend)
   - Routes: /trainer/dashboard, /trainer/course/:id
 - Publishing (Internal)
   - Service: PublishingService — Immediate → visibility='public', status='live'; Scheduled → visibility='scheduled', versions.scheduled_at set
 - Post‑Publishing Actions
   - Registration via Directory + registrations table; Assessment, Credential, and Analytics flows as above

3) Assessment & Credential Flow
 - Trigger (Frontend)
   - Learner clicks "Take Test" after lessons
 - Assessment Request (gRPC)
   - To: Assessment → Data: course_id, learner_id, coverage_map
 - Assessment Result (gRPC)
   - From: Assessment → grade, test_result; store in assessments with completion_date
 - Credential Issuance (REST)
   - To: Credly → Data: learner_id, course_id, grade, completion_date → badge issuance

4) Feedback & Analytics Flow
 - Feedback Submission (Frontend / REST)
   - From: /course/:id/feedback → Data: feedback_id, course_id, learner_id, rating, tags, comment → store in feedback
 - Feedback Sharing (REST)
   - To: Directory (feedback event), Management Reporting (aggregated), Learning Analytics (detailed feedback + engagement)
 - Analytics Update (REST)
   - To: Learning Analytics & Management Reporting → Data: course_id, course_name, totalEnrollments, activeEnrollment, completionRate, averageRating, feedbackDictionary, lesson_completion_dictionary, studentsIDDictionary, learning_path

## Communication Patterns
- REST for most services; gRPC for Content Studio, Assessment, and RAG

## Security Architecture
- Token Flow (OAuth2 / Auth Microservice)
  - OAuth2 Issuer: Dedicated Auth microservice (IdP) issues JWT access tokens; Course Builder consumes only (no login/password handling)
  - Token Contents (JWT Claims): sub (user id), role (learner/trainer/admin/service), scope (course.read, course.write, etc.), exp/iat/iss/aud
  - Flow: User/service authenticates → Auth returns JWT → Frontend includes in Authorization: Bearer header → Backend middleware verifies signature, expiry, scopes/roles
- Scopes & Roles
  - Scopes: course.read, course.write, course.publish, feedback.write, analytics.write, assessment.read
  - learner: view public/personalized courses, register, study, trigger assessment, submit feedback; cannot create/modify/publish
  - trainer: view AI/Content Studio courses, validate/edit metadata, manage publishing (immediate/scheduled), see aggregated feedback/analytics; cannot access learner-specific raw data
  - admin: full access for debugging/operations (override publishing, view all courses)
  - service: service-to-service calls from Learner AI, Content Studio, Assessment, Analytics, Management Reporting, Directory, Credly, etc.
- Data Encryption
  - In Transit: TLS 1.3 (HTTPS/mTLS) for HTTP/gRPC; no plain HTTP between microservices
  - At Rest: PostgreSQL/Supabase AES-256; sensitive fields optionally encrypted at application level
  - Secrets Management: API keys, DB credentials, signing keys stored in Vault/platform secrets (not in code/config)
- RBAC Application (Portals & API Endpoints)
  - Global Middleware: AuthMiddleware validates JWT, extracts role/scopes; RBACMiddleware checks permissions
  - Learner Portal: Routes /learner/* require role=learner, scopes course.read, feedback.write; Backend GET /api/v1/courses/:id → role in [learner, trainer, admin], course.read; POST /api/v1/courses/:id/register → role=learner, course.write; POST /api/v1/courses/:id/feedback → role=learner, feedback.write
  - Trainer Portal: Routes /trainer/* require role in [trainer, admin], scopes course.write, course.publish, analytics.read; Backend PUT /api/v1/courses/:id → role in [trainer, admin], course.write; POST /api/v1/courses/:id/publish → role in [trainer, admin], course.publish
  - Service-to-Service: Endpoints like POST /api/v1/internal/assessment/report require role=service with scoped tokens (analytics.write, assessment.read, content.write)

## Observability & Operations
- Logging Strategy
  - Framework: Centralized JSON-based logging via Winston or Pino (Node.js)
  - Log Levels: info (major flow events), warn (recoverable errors), error (service failures), debug (TDD diagnostics, disabled in production)
  - Log Context Fields: timestamp, request_id, service, endpoint, role, course_id, learner_id, status_code, duration_ms
  - Aggregation: Stream to Railway/Supabase logging; forward to APM (Datadog/Grafana Loki/ELK); correlation IDs for workflow tracing
- Metrics & Monitoring
  - Runtime Metrics (Prometheus/OpenTelemetry): Request counters per endpoint, latency histograms (avg/p95/p99), error rates by status/dependency
  - Workflow Metrics: courses_built_total, courses_published_total, feedback_received_total, avg_course_build_time_seconds, assessment_success_rate
  - Health Checks: /health REST endpoint and gRPC health probe for Railway readiness; verifies DB connectivity and gRPC client health
- Alerts & Incident Management
  - Channels: Railway/GitHub Actions → Email + Slack; optional PagerDuty for critical incidents
  - Triggers: High latency (>5s) in course generation/enrichment, 2 consecutive gRPC failures, DB connection failures, 5xx error rate > 2% in 5min, failed deployment/test pipeline
  - Recovery: RetryQueue replays failed outbound requests; auto-scaling when CPU > 70% or memory > 80%
- Backup & Recovery
  - Database: Automated daily full backups (30-day retention), PITR enabled, AES-256 at rest
  - Config & Secrets: Stored via Railway env vars or Vault; secret rotation every 90 days
  - RTO: ≤ 10 minutes for service restart/failover; RPO: ≤ 1 minute (data loss tolerance with PITR)
- CI/CD & Operational Validation
  - GitHub Actions: Lint → Unit Tests → Integration Tests → Security Scan → Deploy (Railway + Vercel); post-deploy smoke tests validate API health and gRPC connectivity
  - TDD Validation: Test reports stored with build artifacts; coverage reports maintain ≥ 80% baseline

## Risks & Trade-offs
- Integration Complexity vs. Simplicity (Microservice Coupling)
  - Risk: Heavy reliance on multiple external microservices; failures or latency can stall orchestration
  - Trade-off: Direct REST/gRPC integrations for faster MVP delivery instead of asynchronous messaging
  - Mitigation: RetryQueue for failed calls and health-check monitoring; may migrate to event-driven/queue-based later
- Performance vs. AI Enrichment Quality
  - Risk: Real-time AI enrichment and validation can increase course build time
  - Trade-off: Prioritized quality and contextual accuracy over minimal latency
  - Mitigation: AI enrichment runs asynchronously with caching; average build target remains ≤ 5s
- Consistency vs. Availability
  - Risk: Strict versioning and validation may delay updates or create temporary unavailability during publishing
  - Trade-off: Strong consistency and immutable version history for data integrity and auditability
  - Mitigation: Background job queue for non-critical operations; read replicas for analytics workloads
- Scalability vs. Cost
  - Risk: Horizontal scaling of backend and database can raise cloud resource costs
  - Trade-off: Scalable but lightweight stack (Node.js + PostgreSQL + Supabase) to balance throughput and cost
  - Mitigation: Auto-scaling on Railway; Supabase read replicas activated only under sustained load
- Observability Depth vs. Development Overhead
  - Risk: Full OpenTelemetry + distributed tracing early increases initial complexity
  - Trade-off: Minimal observability baseline (structured logs + metrics + alerts) to avoid slowing MVP delivery
  - Mitigation: Can extend with centralized APM (Grafana/Datadog) in later stages
- Security vs. Developer Agility
  - Risk: Strict OAuth2 + RBAC enforcement and encrypted data flows may complicate local testing and CI/CD
  - Trade-off: Security-first design to ensure compliance and safe inter-service communication
  - Mitigation: Mock tokens, local dev keys, and test-scope role bypass in staging environments


