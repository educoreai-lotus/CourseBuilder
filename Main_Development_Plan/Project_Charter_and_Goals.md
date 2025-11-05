[Stage: Project Initialization]
[Feeds: Requirements & Scoping]
[Created: 2025-11-03]

# Project Charter & Goals

## Overview
Course Builder is an AI-driven microservice that orchestrates the automatic creation, enrichment, and management of modular learning programs. It transforms learning paths or trainer-provided content into structured, validated courses — enabling fast, intelligent publishing within an internal mini-marketplace and delivering personalized, high-quality learning experiences for both trainers and learners.

## Vision
Course Builder is a dedicated microservice that orchestrates the creation and management of modular courses. It builds course structures automatically from learning paths and skills, while its integrated AI enriches course content with supporting materials and metadata.

## Goals
 - **Personalized & Trainer-Driven Course Building**: Automatically build course structures (Topics → Modules → Lessons) from Learner AI (personalized path) or Content Studio (trainer-provided content).
 - **AI Content Enrichment & Integration**: Enrich lesson materials with AI-generated metadata and supporting content (e.g., videos, projects) before publishing.
 - **End-to-End Learning Flow**: Support the full learner lifecycle — from course creation and publishing in the internal mini‑marketplace, through registration, studying, assessment, and feedback sharing across connected microservices.

## Non-Goals
 - **External Marketplace or Public Distribution**: No external marketplace integration — all publishing and registration occur inside the internal mini‑marketplace.
 - **Manual Lesson Authoring by Trainers**: Trainers do not create lessons from scratch; they only edit, validate, and publish AI‑enriched content.

## Stakeholders & Responsibilities
 - AI Program Lead — Vision & Alignment — Oversees Course Builder vision within the AI learning ecosystem; defines objectives; ensures support for adaptive, intelligent course creation.
 - Software Architect / Lead Developer — System Design & Delivery — Designs and implements backend, frontend, and integrations; enforces architecture consistency and security compliance; delivers v1 MVP.
 - Trainer (Instructor User) — Content Quality — Reviews, edits, validates, and publishes AI‑enriched courses to the internal mini‑marketplace; ensures content quality and accuracy.
 - Learner (End User) — Learning Engagement — Registers, studies lessons, completes assessments, and provides post‑course feedback.

## Scope Boundaries
 - In Scope:
   - Receiving triggers from Learner AI (personalized learning path) and Content Studio (trainer-provided lessons).
   - Automatic course structure generation (Topics → Modules → Lessons).
   - AI enrichment of lessons with metadata, tags, and optional YouTube/GitHub content.
   - Internal publishing to the mini‑marketplace (immediate or scheduled).
   - Learner registration, lesson access, progress tracking, and assessment integration via the Assessment microservice.
   - Feedback collection and data sharing with Learning Analytics, HR, and Directory microservices.
   - Full implementation of security, TDD, and RBAC for v1.
 - Out of Scope:
   - Integration with external marketplaces or third‑party distribution platforms.
   - Manual lesson authoring or complex content editing inside Course Builder (handled by Content Studio).
   - Advanced analytics dashboards or visualization tools (Learning Analytics handles reporting).
   - AI model training or NLP fine‑tuning (only consumption of AI enrichment outputs).

## Constraints & Assumptions
 - **Time**: MVP delivery prioritized — focus on end-to-end core flow (trigger → publish → assessment → feedback).
 - **Budget**: Limited to internal resources; no paid third‑party marketplaces or external AI APIs beyond open/free integrations (e.g., YouTube, GitHub).
 - **Tech Stack**:
   - Backend: Node.js + Express (Railway)
   - Frontend: React (JavaScript ES6) with Vite + Tailwind (Vercel)
   - Database: PostgreSQL (Supabase)
   - Communication: REST + gRPC (for Content Studio, Assessment, and RAG)
 - **Compliance & Security**:
   - OAuth2 for inter‑service authentication; RBAC for UI
   - AES‑256 encryption at rest; TLS 1.3 in transit
   - GDPR‑ready: learner data anonymized; shared only with relevant internal microservices

## Success Criteria
 - **End-to-End Workflow Completion**: Trigger (Learner AI/Content Studio) → structure generation → AI enrichment → publishing → registration → assessment → feedback completes without errors.
 - **Course Generation Accuracy**: ≥ 90% of generated courses pass metadata validation (skills alignment, structure integrity, prerequisites).
 - **System Stability**: ≥ 99% uptime during testing; test coverage ≥ 80% for core logic (TDD).
 - **Security & Compliance**: OAuth2 + RBAC enforced; AES‑256 at rest, TLS 1.3 in transit; GDPR compliance verified.
 - **Performance**: Structure generation + enrichment average < 5s per request.
 - **User Engagement**: ≥ 80% of learners complete lessons and submit post‑course feedback via the internal mini‑marketplace.

## Key Decisions & Rationale
 - **Internal Mini‑Marketplace Only**: Keep publishing and discovery fully internal to simplify architecture, avoid external dependencies, and align with privacy goals.
 - **Two Input Triggers (Learner AI & Content Studio)**: Provides flexibility between AI‑driven personalization and trainer‑guided courses under a single orchestration flow.
 - **Tech Stack Standardization**: Node.js + Express (Railway), React (JavaScript ES6) + Vite + Tailwind (Vercel), PostgreSQL (Supabase) — chosen for rapid MVP, scalability, and team familiarity.
 - **TDD and CI/CD Adoption**: Enforce TDD and GitHub Actions pipelines to ensure reliability, prevent regressions, and enable fast iteration.
 - **Security‑First Design**: OAuth2 + RBAC + AES‑256 + TLS 1.3 mandated from v1 for inter‑service auth, data protection, and GDPR compliance.
 - **AI Limited to Enrichment (Not Creation)**: AI enhances and validates content rather than generating full lessons to ensure trainer oversight and accuracy.

## Risks & Mitigations
 - Integration failures between microservices (Learner AI / Content Studio / Assessment)
   - Mitigation: Use mock APIs and retry queues for failed calls; implement gRPC health checks and explicit timeout/retry policies.
 - Data inconsistency or version conflicts
   - Mitigation: Enforce versioning at the DB level; every structure or metadata change creates a new course version.
 - AI enrichment inaccuracy or irrelevant content
   - Mitigation: Keep enrichment optional and trainer‑reviewed prior to publishing; allow manual metadata correction in admin dashboard.
 - Security or access control issues
   - Mitigation: Apply OAuth2 for all service communication; RBAC for UI; automated security testing in CI/CD.
 - Performance bottlenecks (slow structure generation)
   - Mitigation: Use async job handling and caching for repeated enrichment/content requests; performance test for < 5s average build times.

## Refinements
- Feature: TBD — TBD


