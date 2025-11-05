[Stage: Requirements & Scoping]
[Feeds: Architecture Design]
[Created: 2025-11-03]

# Requirements & Scoping — Course Builder

## Overview
TBD — concise summary of scope for v1.

## Functional Requirements
 - Trigger Handling: Accept inputs from Learner AI (learning path + skills) or Content Studio (trainer lessons).
 - Course Structure Generation: Automatically build course hierarchy (Topics → Modules → Lessons) aligned with learning goals.
 - Content Delegation: Send structure and learner/company context to Content Studio via gRPC to generate lessons and exercises.
 - AI Enrichment: Enhance lessons with metadata, tags, and optional resources (YouTube, GitHub).
 - Metadata Validation: Verify course completeness, skill alignment, and prerequisites before publishing.
 - Publishing System: Allow Immediate or Scheduled publishing to the internal mini‑marketplace.
 - Learner Registration & Progress Tracking: Enable registration, lesson access, and progress tracking within the course.
 - Assessment Integration: Redirect learners to the Assessment microservice and receive reports for completion tracking.
 - Feedback Collection: Collect and store post‑course ratings and comments linked to course versions.
 - Data Distribution: Share engagement, progress, and feedback data with Learning Analytics, HR, and Directory microservices.
 - Version Management: Create a new version whenever a course structure or metadata changes.
 - Security & Access Control: Enforce OAuth2 for inter‑service calls, RBAC for UI access, and encrypt all stored data.

## Non-Functional Requirements
 - Performance
   - Course structure generation and AI enrichment complete in ≤ 5 seconds per request.
   - API response time for standard operations (create, publish, register) averages < 300 ms.
 - Availability & Reliability
   - 99% uptime target during active hours.
   - Automatic retry and queue handling for failed external (gRPC/REST) calls.
   - DB backups and recovery: RTO < 5 min, RPO < 1 min.
 - Security & Compliance
   - OAuth2 for inter-service authentication; RBAC for UI access.
   - AES-256 at rest; TLS 1.3 in transit.
   - GDPR-ready: anonymized learner data, minimal retention, opt-out supported.
   - Secrets and tokens stored in Vault.
 - Observability & Monitoring
   - Centralized logging (requests, workflow events, errors).
   - APM metrics for CPU, memory, request latency.
   - Alerts for failed workflows, publishing errors, slow API responses.
 - Scalability
   - Horizontally scalable, stateless Node.js backend.
   - Supabase read replicas for load balancing.
   - Supports thousands of concurrent learners and multiple simultaneous course builds.

## User Stories & Flows
1) AI‑Generated Personalized Course Flow (Learner AI Trigger)
   - Learner AI sends learning path + skill set to Course Builder.
   - Course Builder generates modular structure (Topics → Modules → Lessons).
   - Requests Content Studio for lessons and exercises based on the structure.
   - AI enriches content with metadata, tags, and optional YouTube/GitHub resources.
   - If not marked as personalized, publishes the course to the internal mini‑marketplace.
   - Learner registers → studies lessons → completes Assessment (redirect to Assessment microservice) → submits feedback.
   - Feedback, analytics, and performance data shared with Learning Analytics, HR, and Directory.

2) Trainer‑Driven Course Flow (Content Studio Trigger)
   - Content Studio sends a trainer‑created course to Course Builder.
   - Course Builder validates structure, enriches content with AI metadata, and prepares for publishing.
   - Trainer reviews/edits and chooses Immediate or Scheduled publishing in the internal mini‑marketplace.
   - Learners register, complete lessons, take Assessment (redirect to Assessment microservice), and provide feedback.
   - Course Builder distributes results and analytics data to connected microservices.

3) Feedback & Analytics Flow
   - After course completion, learner submits a rating and comment.
   - Course Builder stores feedback, links it to the specific course version, and shares data with Directory and Learning Analytics.

4) Credential & Assessment Flow
   - Course Builder redirects the learner to the Assessment microservice with coverage data.
   - Receives the assessment report and sends it to Learning Analytics, HR, and Credly for credential issuance.

## Integrations & Contracts
- Learner AI — trigger + payload schema for learning path and skills
- Content Studio — lesson/exercise retrieval and validation
- Assessment — redirect and report callback contracts
- Learning Analytics — events and KPI reporting
- HR — learner progress/completion events
- Directory — learner identity and group mappings
- Credly — credential issuance trigger

## Constraints & Assumptions
 - Environment & Infrastructure
   - Deploy backend to Railway and frontend to Vercel for MVP.
   - PostgreSQL (Supabase) is the only supported DB in v1 (no multi‑DB/NoSQL).
   - gRPC only for Content Studio, Assessment, and RAG; other services via REST.
   - Internal mini‑marketplace only; no external marketplace endpoints.
 - Data & Access Rules
   - Anonymize learner/trainer data when sharing with Analytics or HR services.
   - Content from Content Studio validated; store by reference only (no external file hosting).
   - Published course versions are immutable; modifications create new version records.
 - Team & Process
   - Small core team (AI Program Lead + Software Architect/Developer) limits parallel tracks.
   - TDD for core services with ≥ 80% coverage required before merge.
   - Manual review step for trainer publishing until automated approval is added later.
   - AI enrichment models are predefined; no new training during Stage 02.

## Acceptance Criteria
### 1) AI-Personalized Course Flow (Learner AI Trigger)
 - On receiving learning path + skill set from Learner AI:
   - Generates a valid modular structure (Topics → Modules → Lessons) within ≤ 5s.
   - Requests and receives lessons/exercises from Content Studio.
   - Applies AI enrichment (metadata, tags, external resources) successfully.
   - Publishes to internal mini‑marketplace only if not marked as personalized.
   - Learner registration → study → assessment → feedback completes without errors.
 - Test: Mock Learner AI trigger → verify structure creation, enrichment, and publication.

### 2) Trainer-Driven Course Flow (Content Studio Trigger)
 - On receiving trainer content from Content Studio:
   - Validates structure and enriches lessons with AI metadata.
   - Trainer can edit, approve, and choose Immediate or Scheduled publishing.
   - Course appears in internal mini‑marketplace at the chosen time.
   - Learners can register, study, complete assessment, and submit feedback.
 - Test: Mock Content Studio trigger → verify validation, enrichment, publishing, and registration.

### 3) Assessment & Credential Flow
 - After course completion:
   - "Take Test" redirects to Assessment microservice with learner ID + coverage map.
   - Assessment report is returned, stored, and shared with Learning Analytics, HR, and Credly.
   - Credential issuance request sent with learner ID, course ID, score, completion date.
 - Test: Simulate learner completion → verify report exchange and credential data propagation.

### 4) Feedback & Analytics Flow
 - Upon assessment completion:
   - Learner can submit rating and feedback tied to the correct course version.
   - Feedback stored and shared with Directory and Learning Analytics.
   - Analytics receives course progress, completion, and engagement data.
 - Test: Complete course as learner → verify feedback storage and analytics transfer.

## Open Questions & Clarifications
- Mini-Marketplace Data Model
  - Use existing `courses` table with visibility flag (private, public, scheduled).
  - Only latest published version visible; older versions archived.
- AI Enrichment Configuration
  - Enrichment (YouTube, GitHub, metadata tagging) is configurable per course.
  - Trainers can re-run enrichment after edits before publishing.
- Assessment Flow Details
  - Store summary assessment data only: score, pass/fail, coverage map, completion date.
- Feedback Timing & Visibility
  - One feedback submission per learner per course version; feedback locked after submission.
  - Trainers see feedback immediately in dashboard (no moderation step).
- Analytics Integration Format
  - JSON over REST; event streaming/webhooks possible later.
- UI Architecture Boundary
  - Single React app with routes split: `/admin` (trainer) and `/learner` (learner).
- Security & Auth Scope
  - OAuth2 + RBAC sufficient for v1; SSO may be added later.


