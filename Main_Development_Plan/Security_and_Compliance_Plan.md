[Stage: Security & Compliance]
[Feeds: Style Guide]
[Created: 2025-11-04]

# Security & Compliance Plan

## Overview
Course Builder enforces GDPR compliance, role-based access control, and data encryption for learner PII, assessment results, and training content. Security-first design with OAuth2 service authentication, audit logging, and anonymization for external analytics sharing.

## Data Classification & Flows
- Data Categories & Sensitivity
  - PII (Medium sensitivity): learner_id, learner_name, company_id — anonymized when shared externally
  - Training Content (Low–Medium): course structures, metadata, topics, lessons — non-confidential business IP
  - Assessment Results (High sensitivity): learner performance reports and coverage maps — confidential educational records
  - Feedback & Ratings (Low sensitivity): anonymous qualitative data — shared only with Marketplace and Directory
- Retention Policy
  - PII & Assessment Data: 12–24 months; anonymized after course completion for analytics
  - Course Metadata & Content Structures: retained indefinitely for version control and compliance
  - Feedback & Ratings: 12 months for reporting and analytics
- Compliance Scope
  - Primary Regulation: GDPR (EU/EEA learners and corporate clients)
  - Additional Practices: Anonymized learner analytics; AES-256 at rest, TLS 1.3 in transit; RBAC and OAuth2 service-to-service auth; audit logging and traceability for sensitive operations

## Threat Model & Controls
- Unauthorized Access (PII / Admin Panels)
  - Controls: OAuth2 for all service calls; RBAC on UI and API; short‑lived JWTs; centralized AuthMiddleware validation; audit logging for privileged actions
- Data Breaches (Database or API Exposure)
  - Controls: AES‑256 at rest; TLS 1.3 in transit; secrets in Vault; least‑privilege PostgreSQL roles; regular vuln scanning and dependency audits
- Service Impersonation / API Spoofing
  - Controls: mTLS or OAuth2 client credentials for service‑to‑service; signed JWT verification; gRPC auth headers with service IDs; request signature validation for sensitive payloads (Assessment, Content Studio)
- Injection & API Abuse
  - Controls: Input validation/sanitization; parameterized queries; rate limiting/throttling; API Gateway schema validation and quotas
- Data Leakage via Logs
  - Controls: Centralized logger excludes PII and assessment results; log rotation/retention; masked identifiers in logging pipeline
- Denial of Service (DoS) / Performance Degradation
  - Controls: Request throttling; RetryQueue with exponential backoff; auto‑scaling on Railway/Vercel; load tests targeting ≥ 10k concurrent learners
- Third‑Party Integration Risk (YouTube, GitHub, Credly)
  - Controls: Scoped API keys; token rotation; outbound request proxying; minimal data exchange; retry and failure isolation queue

## Identity & Access Management
- Token Lifetimes
  - Access Tokens: Short‑lived (15–30 minutes) JWT (RS256). Claims include role, scope, course_id. Frontend performs silent refresh before expiry
  - Refresh Tokens: Valid 24h; stored securely (httpOnly cookie or encrypted storage); rotation enforced on every use
  - Service‑to‑Service Tokens: OAuth2 client credentials; 10–15 min lifetime; no refresh; backend renews automatically
- Scopes per Endpoint Group
  - Course Management: /api/v1/courses, /api/v1/courses/:id → scopes: course:read, course:write; roles: admin, trainer
  - Publishing: /api/v1/courses/:id/publish, /api/v1/courses/:id/schedule → scope: publish:manage; roles: admin, trainer
  - Registration & Study: /api/v1/courses/:id/register → scopes: learner:enroll, learner:read; role: learner
  - Feedback: /api/v1/courses/:id/feedback, /api/v1/feedback/:id → scopes: feedback:write, feedback:read; roles: learner, trainer
  - Analytics & HR Reports (internal): → scopes: analytics:share, hr:share; role: service
  - Assessment (gRPC): AssessmentService.StartAssessment → scope: assessment:trigger; role: service
  - Credentialing (REST): /api/v1/credential/issue → scope: credential:issue; role: service
- Admin Override & Audit Rules
  - Admin Override: Admins may re‑publish, revoke, or unpublish courses using publish:override; 2‑step confirmation required; all actions logged with timestamp, actor ID, and resource
  - Audit Logging: Every token issuance/revocation and privileged operation logged to centralized AuditLog and monitoring; logs include user/service ID, scope used, IP, request context (no sensitive payloads). Immutable audit trail retained for 12 months

## Data Protection (Encryption & Secrets)
- Encryption & Key Management
  - At Rest: All database fields containing PII or assessment data encrypted with AES‑256‑GCM
  - In Transit: All service and client communications use TLS 1.3 (HTTPS / gRPC‑secured)
  - Key Management: Encryption keys stored in HashiCorp Vault KMS with strict role‑based access; keys rotated every 90 days automatically (manual rotation on incident response); services authenticate to Vault via short‑lived tokens with least‑privilege policies
  - Secrets: API credentials (YouTube, GitHub, Credly, etc.) stored in Vault → auto‑rotation scripts trigger on expiry
- Logging & PII Minimization
  - PII Exclusion: Logs never record learner names, emails, or assessment content
  - Sanitization: Logger middleware masks IDs (learner_****) and truncates tokens
  - Centralized Logging: Structured JSON logs streamed to secure aggregation (read‑only role)
  - Access Controls: Only DevOps + Security roles can view system logs
  - Retention: Logs retained for 90 days, then automatically purged or archived anonymized
- Retention & Deletion Procedures
  - PII (Learner ID, Name, Company ID): 12–24 months post‑completion; deletion triggered by GDPR "Right to Erasure" request or scheduled purge; responsible: Data Protection Officer (DPO)
  - Assessment Results: 12 months; automated anonymization after course completion + report export; responsible: Course Builder Service / DPO
  - Feedback & Ratings: 12 months; periodic cleanup job (monthly); responsible: Course Builder Service
  - Course Metadata & Structure: Indefinite (version history); never deleted; version archived only; responsible: System Admin
  - Logs & Audit Records: 90 days (operational) / 12 months (audit); automated rotation → secure archive; responsible: DevOps Team
  - Anonymization Method: Replace personal identifiers with hashed UUIDs before sharing with Learning Analytics, HR, or RAG
  - Deletion Workflow: Trigger (scheduled job or user request) → DPO approval → secure deletion via API (DB record purge + Vault key revocation) → log audit entry "erasure completed"

## Logging, Monitoring & Incident Response
- Security Events Monitored
  - Authentication & Access: Failed logins, expired/invalid tokens, RBAC violations, admin overrides → Detection: AuthMiddleware logs + SIEM alerts
  - Data Integrity: Unauthorized DB writes, abnormal data volume, schema changes → Detection: PostgreSQL audit plugin + integrity checks
  - API Activity: Excessive request rate, failed API calls, malformed payloads → Detection: API Gateway + rate limiter metrics
  - Service Health: gRPC or REST service downtime, retry queue overflow → Detection: Prometheus metrics + uptime probes
  - Infrastructure & Config: Vault token misuse, expired secrets, configuration drift → Detection: Vault audit logs + config monitor
  - Error & Exception Logs: Uncaught exceptions, 5xx responses, repeated retries → Detection: Centralized Logger aggregation (JSON pipeline)
- Alert Thresholds & Severity
  - Critical: Data breach, service impersonation, Vault compromise, DB dump → Immediate containment + SOC notification
  - High: Multiple failed logins, repeated auth errors, high CPU/memory usage → PagerDuty alert to Security Lead within 15 min
  - Medium: API rate spikes, delayed queue retries → Auto-scaling or throttling triggered; monitor in 1 hr
  - Low: Minor validation or client errors → Logged for weekly review; no immediate alert
- Incident Response Workflow
  - Detection & Alerting: Automated alerts from monitoring stack (Prometheus + Grafana + SIEM) or manual report
  - Initial Triage (within 15 minutes): Security Engineer validates alert; classifies severity
  - Containment: Revoke affected tokens, isolate compromised microservice (via Railway deployment rollback or Vault token revocation)
  - Investigation: Collect logs, audit trails, and system snapshots; identify root cause (code, dependency, misconfig)
  - Eradication & Recovery: Apply patch or config fix; rotate secrets/keys in Vault; redeploy service (CI/CD GitHub Action)
  - Notification & Escalation: Primary: Security Lead → DevOps → Product Owner; Escalation (if breach confirmed): notify DPO, affected clients, and compliance team within 72 hours (GDPR Article 33)
  - Post-Incident Review: Document incident in Incident Register; Root-cause analysis (RCA) meeting within 48 hours; apply preventive improvements (test coverage, monitoring rules, or automation scripts)
- Tools & Integrations
  - Monitoring: Prometheus, Grafana, Railway health checks, Vercel uptime monitor
  - Alerting: PagerDuty / Slack webhooks
  - Logs: Centralized JSON logs, rotated daily
  - SIEM: Optional integration for correlation (Elastic or Sumo Logic)

## Privacy, Retention & Regulatory Compliance
- GDPR Rights
  - Right to Access: Learners can request a copy of all personal data (registration, feedback, assessment report) via secure API with DPO authorization and identity verification; data provided within 30 days
  - Right to Erasure: Triggered by learner request or retention expiry (12–24 months post‑completion); DPO approval → secure deletion (DB purge, Vault key revocation) → anonymized audit entry (erasure_completed)
  - Right to Portability: Structured JSON/CSV export (course history, assessment results, feedback) via secure temporary URL (24h token)
  - Consent Management: Explicit consent at registration; stored as signed record with timestamp; withdrawal disables analytics sharing and triggers anonymization
- Data Processing Agreements (DPAs)
  - Sub‑processors: Railway (backend hosting), Vercel (frontend hosting), Supabase (PostgreSQL), Credly, Content Studio, Assessment — bound under processing agreements; reviewed annually by DPO and legal
- Compliance Documentation & Audit Trails
  - Data Processing Register: Activities, purposes, data types — updated quarterly
  - Audit Logs: Access, publication, data modification — retained 12 months
  - Consent Records: Digital consent + withdrawal history — retained until deletion
  - Incident Reports & RCA: Breach documentation — retained 3 years
  - DPA Archive: Active and historical DPAs — retained 7 years
  - Storage & Access: Artifacts version‑controlled and stored securely with restricted access; immutable append‑only logs in PostgreSQL + SIEM export ensure auditability
- Summary
  - GDPR‑ready by design: anonymization, short‑lived tokens, consent tracking, deletion automation
  - DPO‑led governance ensures lawful basis, user control, and traceability; aligned with GDPR Articles 15–20 and 30–33

## Decisions & Rationale
- TBD

## Risks & Next Steps
- TBD

## Refinements
- Feature: TBD — TBD
