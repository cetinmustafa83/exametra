# PRD (Consolidated) — "SchulOS" — A Free, Self-Hosted, All-in-One School Platform

*(Digidoo-inspired competency core, expanded into a full school operations platform, fully EU/German data-protection compliant. This document merges and supersedes the four prior drafts — Digidoo-clone build prompt, School Platform PRD v2, Legal Compliance addendum v3, and the CoreAI/container architecture update — into a single reference PRD.)*

---

## 0. Project Identity, Mission & Non-Negotiable Principles

**Project name: SchulOS.** Created by **DFM Solutions**, in collaboration with the idea and input of a family member of the firm's owner — a genuine family/company joint effort, not a commercial product line.

**Mission:** SchulOS exists first and foremost to **help protect the environment and nature** — specifically to reduce, and wherever possible prevent, tree-cutting/paper consumption caused by school paperwork (report cards, worksheets, physical notebooks, printed bulletins — see Modules A, B, D, G). It is a **free, donation-supported school project**, not a commercial SaaS. It is built for a real school; this environmental mission is not a marketing angle, it is the reason the project exists, and every module above should be read with "does this reduce paper/print dependency where it reasonably can?" as a live design question, not just a feature list to implement.

**License (this is a hard product requirement, not just a legal footnote — team must draft an actual `LICENSE.md` reflecting exactly this, since it is a custom license, not a standard OSI one):**
- Free to copy, use, and modify — by any school, anywhere.
- **Selling SchulOS (or a derivative of it, or hosting/support services built on it) is strictly prohibited.**
- **If any revenue is ever generated in connection with the project** (e.g., optional hosting/support fees a school or third party might charge, or — relevant to **Module B**'s sponsor-slide feature — sponsor revenue collected through the Signage module), **that revenue must be donated to environmental protection agencies or environmental protection associations.** This is not optional and not a suggestion — it is the license condition. `docs/legal/LICENSE.md` must state this explicitly, and any in-product feature that could plausibly generate revenue (Module B's sponsor slides are the clearest example already in this PRD) must surface this requirement in its own admin-facing copy, not just bury it in a root-level license file nobody reads before turning the feature on.
- Because this is a non-standard, custom license condition (no-sale + mandatory environmental-donation-of-revenue clause), it does **not** map cleanly onto a stock OSI license like AGPLv3 or MIT — draft the actual license text as a custom document (a lawyer/DPO-adjacent review is worth getting here too, same spirit as Module L's legal disclaimers), rather than just slapping an OSI license badge on the repo that wouldn't actually enforce these terms.

These principles override every design decision in this document:

1. **DB: SQLite.** Single-file, self-hostable, cheap to run and back up. (One narrow exception: an optional embedded vector store for AI search — §3 — which can also run fully local/in-process.)
2. **No hardcoding, anywhere.** Every list, label, rule, threshold, escalation window, warning count, template, retention period, and permission must come from the database or an admin-editable config table — never a constant baked into code. If a value could plausibly differ between two schools, two German states, or change next semester, it is a DB row, not a literal.
3. **No mock data, ever** — not in dev, not in demo, not in shipped UI. Seed scripts may create *realistic sample rows* for local development (clearly documented as seed data, easily wiped), but the shipped application must never silently render placeholder/fake data as if real.
4. **No duplicate functionality across pages.** Every capability lives in exactly one canonical place (e.g., all dates live only in the Calendar module; all alerts render only through the Notifications module). Before adding any feature, check whether an existing module already owns that responsibility; extend it there or surface it as a read-only widget — never rebuild it.
5. **Tablet-first, touch-first**, with a well-adapted layout for desktop/PC. This is the primary device class for teachers and students in-classroom; admin/office use skews PC, but the same design system must feel native on both. **This is a cross-cutting design mandate that governs every screen in every module (A–M) — not a separate page, menu, or "mobile view" bolted on afterward.** Full detail in §13.
6. **Everything is dynamic and role/permission-aware**, driven by real DB relationships (school → year → class → subject → student → user), never assumed.
7. **Fully compliant with EU and German data protection law** (GDPR/DSGVO, BDSG, and the relevant state's Schulgesetz/Schul-Datenschutzverordnung), with explicit, engineered protections for student rights, teacher rights and staff co-determination (Personalrat/unions), parent rights, and the school's own controller obligations — detailed fully in **Module L** (§11). This is not a documentation afterthought: compliance status is itself DB-driven state that gates feature availability (§11.9).
8. **License terms are enforced, not just declared** — see the License block above. No feature ships that would let SchulOS or a derivative be sold, and any revenue-capable feature (currently: Module B sponsor slides) carries a visible reminder of the environmental-donation requirement in its own admin UI.

> **Hard disclaimer to carry into the product and into `docs/`:** This PRD gives the *engineering* requirements needed to make legal compliance *possible*. It is not legal advice. Every school deploying this platform **must** involve its own **Datenschutzbeauftragter (DPO)**, its **Schulträger**, and — for co-determination matters — its **Personalrat/Lehrerrat** before go-live (see §11.9).

---

## 1. Reference Product Analysis (functional inspiration only, not a visual/brand copy)

**Digidoo** (digidoo.com) is a German/Austrian EdTech SaaS. Do **not** copy their branding, illustrations, exact wording, logo, or any copyrighted text/images — build an original UI/UX and original copywriting, only inspired by the **feature set and workflow concept**. Core concepts we reproduce functionally in **Module A** (§4):

- **Competency grids ("Kompetenzraster")**: pre-built and customizable sets of subject/grade-level competencies teachers can use as templates or fully customize.
- **Learning progress entries**: teachers log individual observations per student, linked to one or more competencies, over time (a running log, not a snapshot).
- **Performance assessments ("Leistungsfeststellung")**: structured tests/assignments/checks linked to competencies, feeding the same student timeline.
- **Competence Flower ("Kompetenzblume")**: a radar/spider chart per student showing strength per competency category.
- **One-click reports**: automatically generated, competency-based report text and full report-card documents (PDF).
- **Grade management ("Notenverwaltung")**: configurable weighting between learning-progress entries and formal assessments to compute a transparent final grade.
- **Free tier that "just works"**: since this whole project is free, the entire app is simply free — no tiers.

We explicitly **exclude** anything tied to Digidoo's commercial SaaS business (billing/subscriptions, marketing site, SSO/enterprise integrations like WebUntis) as out of MVP scope.

---

## 2. Module Map

The platform is organized into cohesive modules, each owning its data and UI completely (principle #4 above).

| # | Module | Owns |
|---|--------|------|
| A | **Academics Core** | Competency grids, learning-progress entries, assessments, competence flower, grading, report cards |
| B | **Signage** | TV/billboard displays: announcement slides, sponsor slides, emergency/fire/counseling alerts |
| C | **Communication** | Direct messaging, escalation rules, class/grade social rooms, class-hours messaging locks |
| D | **Learning Hub** | Videos, interactive exercises, worksheets, vocab trainer, learning game, AI-assisted content authoring |
| E | **AI Tutor** | In-context homework help, hint-only policy, full lockout during tests, content translation for foreign students |
| F | **Exam Mode** | Kiosk/lockdown test-taking, teacher live controls, student warning system, incident log |
| G | **Digital Notebook** | Typed + stylus/pen notebook per student per subject, teacher pen annotation on tests/homework |
| H | **Notifications** | All push/in-app notifications — the *only* place alerts render outside their originating context banner |
| I | **Calendar** | All dates/deadlines/appointments/exam schedules/report deadlines — the *only* source of truth for "when" |
| J | **Dashboard & Widgets** | Per-user customizable home screen assembled from read-only widgets pulling from A–I |
| K | **Identity & Admin** | Users, roles, schools, classes, disciplinary records, audit log, permission/rule configuration |
| L | **Legal & Data Protection** | GDPR/DSGVO compliance engine, retention policy, DPIA gating, RoPA, rights fulfillment for all parties |
| M | **Core AI Orchestrator** | Self-hosted agent runtime (ZeroClaw) powering the AI Tutor, content-authoring assist, translation, admin/teacher AI assistance, and event-triggered automations (SOPs), running as its own service/container |

---

## 3. Tech Stack & Container Architecture

The platform is now explicitly a **four-container system** — frontend, backend, database, and Core AI — each independently deployable, independently scalable, and **fully Kubernetes-compatible** (as well as runnable via a single `docker-compose.yml` for small self-hosted schools). No container reaches into another's storage directly; all cross-container communication is over the internal network via defined APIs.

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  frontend  │────▶│  backend   │────▶│     db     │     │   coreai   │
│ (Next.js/  │     │ (API svc,  │◀────│ (SQLite /  │◀───▶│ (ZeroClaw  │
│  React)    │◀────│  business  │     │  libSQL    │     │  agent     │
│            │     │  logic)    │     │  server)   │     │  runtime)  │
└────────────┘     └─────┬──────┘     └────────────┘     └─────┬──────┘
                          │                                     │
                          └──────────── backend ◀────────────── ┘
                             (coreai calls back into backend's
                              API for data + acts through it;
                              backend calls coreai for AI/automation)
```

- **Frontend container**: React/Next.js (client-rendered or SSR-lite), TypeScript, Tailwind CSS + shadcn/ui, Recharts/Chart.js for the Competence Flower radar chart. Talks to the backend only via its public API — never touches the DB or CoreAI directly.
- **Backend container**: a standalone API service (Next.js API-only build, or a dedicated Node/Fastify/Express service — pick one and justify in `docs/ARCHITECTURE.md`) owning all business logic from Modules A–L: auth, permissions, grading, scheduling, escalation policy, compliance gating, etc. This is the **only** service allowed to write to the database and the **only** service allowed to call CoreAI (§12) — CoreAI never talks to the DB directly, keeping one clear, auditable data-access boundary (this also makes Module L's audit logging and access-control-by-default trivial to enforce, since there's exactly one write path).
- **Database container**: **SQLite stays the DB engine** (§0.1), but to satisfy "DB in its own container" in a real multi-pod/Kubernetes topology, run it via **libSQL (`sqld`)** — an open-source, SQLite-file-compatible server (same file format and SQL semantics as SQLite) that speaks a normal network protocol (HTTP/gRPC), so the backend container can reach it like any other network database instead of requiring a shared filesystem mount. For the simplest single-VPS/docker-compose self-hosting path, a school can instead run the plain SQLite file colocated with the backend container (via a shared volume) — document both modes in `docs/ARCHITECTURE.md`/`docs/SELF_HOSTING.md`, with libSQL/`sqld` as the default for the Kubernetes deployment path and plain file-mode as the default for the single-VPS docker-compose path. Either way, backups/retention/erasure logic in Module L operates identically since the SQL surface is the same.
- **CoreAI container**: runs **ZeroClaw** (zeroclaw-labs/zeroclaw) as the platform's self-hosted agent runtime/"core brain" — see **Module M**, §12, for full detail.
- **Auth**: self-hosted email/password (argon2id hashing) + session cookies (Lucia Auth / Auth.js), issued and validated only by the backend container. No third-party paid auth. Optional TOTP 2FA.
- **PDF generation**: `@react-pdf/renderer` or Puppeteer-based HTML-to-PDF, run inside the backend container (or a short-lived job container it spawns) for report cards.
- **File storage**: local filesystem on a persistent volume mounted to the backend container, abstracted behind a storage interface so S3-compatible storage can be swapped in later without touching business logic.
- **i18n**: German and English UI strings from day one (`next-intl` or equivalent) — all UI text through translation keys, never hardcoded.
- **PWA/Kiosk infrastructure**: **Workbox**, in the frontend container's build, for the service worker — offline shell caching, reliable kiosk/fullscreen "install as app" behavior, and Web Push delivery (Modules F, H, §12).
- **Worker offloading**: **Comlink**, in the frontend, to offload heavy client-side work (stylus stroke processing in the Digital Notebook, client-side AI-translation pre/post-processing) to a Web Worker via simple RPC, keeping the main thread responsive for touch input.
- **AI/semantic search (optional)**: **Chroma**, run either as a fifth optional container or embedded within the CoreAI container, for semantic search over Learning Hub resources and retrieval-augmented context for the AI Tutor — see §12. Never a hard dependency; a school without AI features enabled never needs to run it or the CoreAI container's heavier model-provider paths.
- **Testing**: Vitest/Jest (unit), Playwright (E2E for critical flows: login, create competency grid, log an entry, generate report, run an exam session, and — new — a CoreAI automation smoke test, §12).

### 3.1 Kubernetes Deployment

- Provide both `docker-compose.yml` (frontend, backend, db, coreai — four services, for small self-hosted single-VPS schools) **and** a `/k8s` manifest set (or Helm chart) for schools/districts that want proper Kubernetes deployment:
  - `Deployment` for **frontend** (stateless, horizontally scalable, `HorizontalPodAutoscaler` optional).
  - `Deployment` for **backend** (stateless application logic; if running plain-file SQLite mode this must stay single-replica — document that constraint clearly; libSQL/`sqld` mode removes it).
  - `StatefulSet` + `PersistentVolumeClaim` for **db** (whichever mode is chosen).
  - `Deployment` for **coreai** (ZeroClaw runtime + its own gateway/dashboard, §12), with its own `PersistentVolumeClaim` for agent memory/config, and resource limits sized for whichever model-provider mode is configured (remote API vs. local model).
  - `Service` objects for internal DNS between all four; `Ingress` exposing only frontend (and backend's public API surface if needed) externally — **coreai's dashboard/gateway is never exposed externally by default**, only reachable from backend and from admin users via a backend-proxied, authenticated route (§12.4).
  - `NetworkPolicy` restricting: frontend → backend only; backend → db and backend → coreai; **coreai has no direct network path to db** (§12, data-access boundary); explicit egress rules for coreai's model-provider calls if using a remote LLM API.
  - `Secret`s for DB credentials/connection strings, model-provider API keys, session/auth signing keys; `ConfigMap`s for Module L's policy tables' bootstrap values and any non-secret runtime config.
- Reference `zeroclaw-labs/zeroclaw`'s own `deploy-k8s/` folder as a starting point for the CoreAI container's manifests specifically, adapting rather than reinventing.

Deliver `docs/ARCHITECTURE.md` (stack rationale, four-container boundary rules, self-hosting path) and `docs/SELF_HOSTING.md` (both docker-compose and Kubernetes deployment paths, written for a non-technical school IT admin where possible, with a clearly marked "needs a Kubernetes-literate admin" section for the K8s path).

---

## 4. Module A — Academics Core

### 4.1 Entities

**Organizational:**
- **School** — id, name, schoolType (elementary/middle/gymnasium/other), country, timezone, createdAt.
- **User** — id, schoolId (nullable), email, passwordHash, firstName, lastName, role, locale, twoFactorSecret (nullable), createdAt, deletedAt (soft delete).
- **SchoolYear** — id, schoolId, label, startDate, endDate.
- **ClassGroup** — id, schoolId, schoolYearId, name, gradeLevel, schoolType.
- **ClassGroupTeacher** (M:N) — classGroupId, userId, role (HOMEROOM_TEACHER, SUBJECT_TEACHER).
- **Student** — id, schoolId, firstName, lastName, dateOfBirth (nullable, minimize what's collected), externalId (nullable, import matching), createdAt, deletedAt.
- **Enrollment** — id, studentId, classGroupId, schoolYearId, startDate, endDate (nullable = still enrolled) — models students moving between classes/schools over time.

**Subject & competency structure:**
- **Subject** — id, schoolId (nullable = global template), name, gradeLevelMin/Max.
- **CompetencyTemplate** — id, name, description, subjectId (nullable), schoolType, gradeLevelMin/Max, isGlobalTemplate, createdByUserId (nullable for system templates), version.
- **CompetencyCategory** — id, competencyTemplateId, name, order (groups competencies into "petals" of the flower — e.g. Reading/Writing/Listening within Language Arts).
- **Competency** — id, categoryId, code, title, description, order, masteryLevels (related table).
- **MasteryLevelDefinition** — id, competencyId (or categoryId if shared), levelValue, label, description.
- **ClassCompetencyAssignment** — links a ClassGroup+Subject to a chosen CompetencyTemplate for a SchoolYear, plus per-school customizations. **Clone-on-customize**: assigning a template creates an editable school-owned copy so edits never mutate the global template.

**Progress & assessment:**
- **LearningProgressEntry** — id, studentId, competencyId, teacherId, classGroupId, date, masteryLevelValue, note (optional), createdAt — append-only observation log.
- **Assessment** ("Leistungsfeststellung") — id, classGroupId, subjectId, teacherId, title, date, type (TEST/ORAL/PROJECT/HOMEWORK/OTHER), maxScore (nullable), weight, **deliveryMode** (enum incl. `DIGITAL_LOCKED`, which triggers Module F's kiosk flow).
- **AssessmentCompetencyLink** (M:N) — assessmentId, competencyId, weight.
- **AssessmentResult** — id, assessmentId, studentId, score (nullable), masteryLevelValue (nullable), note.

**Grading:**
- **GradingScheme** — id, classGroupId or subjectId, name, type (NUMERIC_GRADE/VERBAL_FEEDBACK/COMBINED), scaleDefinition (JSON, configurable per country/state).
- **GradingWeightRule** — id, gradingSchemeId, sourceType (LEARNING_PROGRESS/ASSESSMENT), targetRef, weightPercent.
- **ComputedGrade** — id, studentId, subjectId, classGroupId, schoolYearId, period, computedValue, computedAt, isFinalized, **finalizedByUserId (required, human — see §11.5)**, overriddenValue (nullable), overrideReason.

**Reporting:**
- **Report** — id, studentId, classGroupId, schoolYearId, period, generatedByUserId, generatedAt, status (DRAFT/FINAL), pdfFilePath, includesGrades, optional appendix of Digital Notebook entries for the period (teacher-selectable, off by default).
- **ReportSection** — id, reportId, competencyCategoryId (nullable), generatedText, order.

**Auditing:**
- **AuditLog** — id, userId, action, entityType, entityId, timestamp, metadata (JSON).
- **DataExportRequest** — id, requestedByUserId, scope, status, filePath, requestedAt, completedAt.

**Design requirements:** UUID/ULID primary keys (not SQLite-only autoincrement, for portability). All timestamps UTC. Soft deletes on Student/User with an explicit, audit-logged "permanently erase" flow, never a silent hard delete. SQLite WAL mode enabled; document backup strategy (copy the `.sqlite` file + files directory; consider `litestream`). Seed script (`prisma/seed.ts`) creates a demo school, teacher login, 2 classes, ~15 students, one sample competency template (Math + German, elementary, 2 categories, ~6 competencies each, 4-point scale), sample entries and one assessment — app explorable immediately after `docker-compose up`.

### 4.2 Roles for this module
Teacher, School Admin, Super Admin — see full role model in §10 (Module K), which extends this with Counselor, Parent, Student, and DPO.

### 4.3 Core user stories

- **Onboarding & auth:** register/login/reset with argon2id-hashed passwords, optional TOTP 2FA, rate-limited login, CSRF protection on mutating routes.
- **School/class/student setup:** create classes, set grade level/school type, add students (manual or CSV import with preview + error list + re-run).
- **Competency grid management:** browse starter templates filtered by school type/grade/subject; assign (clone) to a class+subject; edit the school's copy or build custom.
- **Logging learning progress:** fast entry from a class roster (<3 interactions), full student timeline, entries editable by the original author within a configurable window, all edits audit-logged.
- **Assessments:** create, link to competencies with weights, bulk spreadsheet-like results entry for a whole class.
- **Competence Flower:** per-student radar chart, aggregation method configurable per template (latest value / average of last N / weighted by recency), hover/tap shows underlying entries, exportable as PNG/SVG.
- **Grade computation:** transparent weighted breakdown, manual override with required justification (audit-logged), computation is a pure deterministic function with unit tests covering edge cases (missing data, all-verbal, partial-year enrollment).
- **Reports:** draft → review/edit → finalize (locked + versioned) → PDF, single or bulk-class export, phrase-template system (data-driven, not hardcoded) for narrative text per mastery level.
- **Data portability & privacy:** export all class/school data as JSON/CSV; permanent erasure with confirmation + audit trail, cascading correctly including generated PDFs on disk (this flow is unified with Module L's rights fulfillment, §11.5).
- **Dashboard:** classes, recent activity, students without a recent entry (follow-up flag), upcoming report deadlines — surfaced as widgets in Module J, not a separate dashboard implementation.

---

## 5. Module B — Signage (TV / Billboards)

Replaces physical bulletin boards with school-controlled TV displays for announcements, class/period info, sponsor content, and emergency alerts.

**Roles:** Admin/Management authors & publishes; sponsor content is admin-approved only (no self-serve); teachers can request a slide (goes to an approval queue by default, config-togglable to trusted self-publish for INFO-type slides).

**License note (see §0):** if a school chooses to run sponsor slides that generate any revenue, that revenue is subject to SchulOS's license terms — it must be donated to an environmental protection agency or association, never kept as school or vendor income. The sponsor-slide creation UI must surface this requirement plainly to the admin at the point of setting up a sponsor slot, not just leave it to `LICENSE.md`.

**Entities:**
- **SignageDisplay** — id, schoolId, location/name, resolution profile, isActive.
- **SignageSlide** — id, schoolId, type (ANNOUNCEMENT/SPONSOR/INFO/SCHEDULE), title, body/media, priority, startAt, endAt, createdByUserId, approvalStatus.
- **SignagePlaylist** — id, displayId (or all displays), ordered slide list, rotation duration per slide.
- **EmergencyAlert** — id, schoolId, type (FIRE/LOCKDOWN/MEDICAL/GENERAL_EMERGENCY/COUNSELING_NOTICE), message, triggeredByUserId, triggeredAt, resolvedAt, affectedScope.

**Core flows:**
- Normal rotation cycles active, date-windowed slides weighted by priority.
- **Emergency override (highest priority, non-negotiable):** any `EmergencyAlert` immediately interrupts every display's rotation with a full-screen, type-styled alert, and simultaneously fires a push notification (Module H) to staff, and for FIRE/LOCKDOWN to logged-in students/parents per school policy. Clears only on explicit resolution by an authorized user, logged in AuditLog.
- **Counseling notice**: lower-urgency, staff-facing only variant — not broadcast school-wide, avoids exposing a student's need for support (also see §11.3).
- Sponsor slides: admin-uploaded, date-windowed, weighted rotation, never auto-published from a teacher request.

---

## 6. Module C — Communication (Messaging & Escalation)

The escalation logic is implemented as **data-driven policy rows**, never hardcoded if/else chains.

**Entities:**
- **MessageThread** — id, schoolId, type (DIRECT/CLASS_ANNOUNCEMENT/SOCIAL_ROOM), participantsOrScope.
- **Message** — id, threadId, senderId, body, sentAt, readReceipts.
- **EscalationPolicy** — id, schoolId, fromRole, toRole, requiredPriorContactRole, waitingPeriodBusinessDays (default 3), isActive, overriddenByUserId (nullable). **All numbers here are read from this table, never hardcoded.**
- **EscalationRequest** — id, requesterId, subject, firstContactThreadId, firstContactAt, eligibleToEscalateAt (computed using the school calendar to skip holidays — Module I), status (WAITING/ELIGIBLE/ESCALATED/RESOLVED).
- **SocialRoom** — id, schoolId, scope (CLASS/GRADE_LEVEL/CUSTOM_GROUP), name, moderatorUserIds, isActive.
- **ClassMessagingLock** — id, classGroupId, lockedByUserId, lockedFrom, lockedUntil (nullable = "until class ends," period-aware via Module I).
- **DisciplinaryRecord** — id, userId, type, description, issuedByUserId, linkedIncident (nullable FK to an ExamWarning or reported message), visibleToParent (bool, enforced access control, not just UI — §11.5), createdAt.

**Core rules (default `EscalationPolicy` rows, admin-editable):**
- **Parent → Admin:** only for genuinely necessary matters, and only after messaging the student's homeroom teacher first. If no reply within **3 business days**, the parent gains the right to escalate to Admin on that thread.
- **Student → Admin/Counseling:** same pattern — homeroom teacher first, then counseling/admin after 3 business days without reply.
- **Teacher → Admin:** direct, no escalation gate.
- **Admin override:** can loosen, tighten, or remove any `EscalationPolicy` row, or grant a case-by-case exception (logged with reason). Can issue a `DisciplinaryRecord` against a teacher or student from a messaging or exam-incident context.
- **Social rooms:** class- or grade/"Stufe"-scoped group discussion spaces, moderated, config-controlled per school (which scopes enabled, moderation-before-visible or not).
- **Class-hours lock:** teacher toggles `ClassMessagingLock` for their class; students blocked from student↔student and student↔staff messaging until lifted (auto-lift at period end via Module I, or manual — config toggle) — students still receive urgent Signage/Notification-level alerts.
- **True-emergency bypass:** the escalation queue always has a parallel "urgent safety concern" path that skips the 3-business-day gate entirely (§11.7) — the escalation rule is a workflow-efficiency rule, never a barrier to reporting a genuine safety issue.

Business-day computation reads the school's holiday/weekend calendar from Module I, never assumes fixed Mon–Fri.

---

## 7. Module D — Learning Hub

A curriculum-aligned self-study resource center, functionally inspired by tools like Sofatutor — original or licensed/open content only, organized the same *way* (by subject/grade), never copying branding, exact video content, or exact wording.

**Entities:**
- **LearningResource** — id, schoolId (nullable = shared library), subjectId, gradeLevel, type (VIDEO/INTERACTIVE_EXERCISE/WORKSHEET/VOCAB_SET/GAME_MODULE), title, description, contentRef, competencyLinks (M:N to `Competency`, so resources surface contextually — e.g. from a weak competency-flower petal), createdByUserId, reviewStatus (DRAFT/PENDING_REVIEW/PUBLISHED), aiGenerated (bool).
- **WorksheetSolution** — attached to a WORKSHEET resource, hidden by default, revealable by student after attempt or by teacher setting.
- **VocabSet / VocabItem** — vocab lists feeding a spaced-repetition vocab trainer.
- **GameProgress** — per-student progress/score for the learning game, scoped by subject.

**Core flows:** teachers/admin create/edit or request AI-assisted drafting (always lands `PENDING_REVIEW`, never auto-published — human review required). Resources are discoverable by subject/grade browse, search, and contextually (surfaced next to a weak Competence Flower petal and in AI Tutor suggestions). Printable worksheets export as PDF with a teacher toggle to include/exclude the solutions page.

---

## 8. Module E — AI Tutor & AI Content Assistance

**Hard policy — enforced server-side, not just prompt instructions:**

- **May**: explain a concept, walk through a *similar* worked example, give a hint, define a term, nudge toward the next step on a specific question.
- **Must never**: produce a direct final answer to an assigned homework/assessment question, complete an assignment for the student, or operate at all while any `Assessment` with `deliveryMode = DIGITAL_LOCKED` is active for that student — the AI chat endpoint independently checks "is this student currently inside an active exam session?" server-side and refuses if so, regardless of client-side UI state (ties into Module F's defense-in-depth, §8).
- Every interaction is logged (`AiTutorInteraction`: id, studentId, subjectId/competencyId, promptSummary, responseSummary, timestamp, flaggedAsHomeworkAttempt) for teacher/admin audit — defaulting to **summary-only, pseudonymized** retention per §11.2/§11.3, with a school-configurable toggle for full-transcript retention and an explicit retention period from Module L.
- **Translation:** on-demand AI translation of learning content (and optionally UI copy) for foreign-language students, labeled "AI-translated," with a flag-for-review path for bad translations. Home-language inference from translation requests is treated with the same minimization discipline as any other data point (§11.3) — no persistent linguistic/ethnic profile is built.
- **Content-authoring assist** (bridges Module D): the same AI capability drafts Learning Hub resources or Signage copy, always landing in a review/draft state.

Module E must never ship ahead of Module F's server-side test-time gate (§16, phasing).

---

## 9. Module F — Exam Mode (Digital Lockdown & Proctoring)

**Entities:**
- **ExamSession** — id, assessmentId, studentId, deviceId, startedAt, status (ACTIVE/PAUSED/RESUMED/ENDED/CANCELLED), pausedByUserId (nullable), pauseReason (BATHROOM_REQUEST/TEACHER_INITIATED/STUDENT_DISTRESS/THIRD_WARNING/OTHER).
- **ExamWarning** — id, examSessionId, issuedByUserId, reason, sequenceNumber, issuedAt.
- **ExamIncidentEvent** — id, examSessionId, type (LOCK_BREACH_ATTEMPT/BATHROOM_REQUESTED/BATHROOM_GRANTED/DISTRESS_SIGNAL/PAUSED/RESUMED/CANCELLED), metadata, timestamp.

**Core flow:**
1. Opening a `DIGITAL_LOCKED` assessment enters **kiosk/fullscreen lockdown** — device locks to the exam UI only, no other tabs/apps, no AI Tutor access (hard-gated), timer visible per config.
2. **Bathroom request:** student taps "request break" → real-time alert to teacher (Module H) → teacher approval pauses that individual `ExamSession` only → resumes on return.
3. **Distress signal:** student sends "I feel unwell / need help" at any time → immediate high-priority alert, distinct styling/sound from a routine request → teacher attends; unresolved → teacher pauses or cancels that student's exam (reason required, logged, visible to parent/admin). **This is health-adjacent data — store only a minimal event flag plus optional free text, never a structured symptom/diagnosis field, restricted to need-to-know visibility (§11.3).**
4. **Behavior warnings:** teacher issues an `ExamWarning` for talking/looking around, etc. 1st and 2nd logged and shown to the student (2nd explicitly "final warning"); 3rd **auto-pauses** that student's exam — but the **pause itself** is a safety/integrity mechanism, not an Art. 22 "decision" about the student; any resulting **disciplinary consequence** requires a human to actually create the linked `DisciplinaryRecord` — the system never auto-generates one (§11.5).
5. Teacher gets a live **class exam-monitor view**: every student's session status at a glance, one-tap pause/resume/cancel/warn.
6. Lockdown enforcement is **defense-in-depth**: client-side kiosk/fullscreen API + Workbox service worker to intercept navigation attempts, **and** an independent server-side session flag blocking AI Tutor/Learning Hub/Messaging calls for the duration — never trust the client alone for an integrity feature.

Module F is the highest integrity/device-sensitivity module — see phasing (§16): built last, after the touch/kiosk foundation (§3 tech stack) is mature.

---

## 10. Module G — Digital Notebook

Digital replacement for the paper exercise notebook (explicit environmental motivation), supporting Germany's range of notebook/exercise-book conventions.

**Entities:**
- **NotebookTemplate** — id, schoolId (nullable = global), name, ruling type (lined/squared-Kariert/blank), gradeLevel/subject applicability.
- **NotebookPage** — id, studentId, subjectId, classGroupId, templateId, createdAt, content (typed text blocks + vector "ink" strokes stored as SVG/stroke-JSON, not raster, so it stays editable/searchable/annotatable).
- **NotebookAnnotation** — id, pageId (or linked Assessment submission), authorUserId, strokeData/comment, createdAt — non-destructive teacher correction marks, captured as its own layer so original student work is never overwritten.

**Core flows:** students write via keyboard and/or stylus, both coexisting on a page. Teachers annotate directly on a digital test/notebook page with pen input (highlighting, circling, margin comments), mirroring paper red-pen correction. Pages organized per subject per student per school year, browsable page-by-page/date-by-date, exportable as PDF.

---

## 11. Cross-Cutting Modules H–K, and Module L (Legal & Data Protection)

### 11.1 Module H — Notifications (single source of alerts)
Every push/in-app alert — messaging, exam warnings/bathroom requests, signage emergencies, escalation-eligibility notices, learning-hub review-queue items — routes through **one** `Notification` entity and **one** delivery pipeline (Web Push API via Workbox service worker + an in-app notification center). No module renders its own separate toast/badge system; every other module *emits into* Module H (per §0.4).

`Notification` — id, recipientUserId, type, priority (NORMAL/URGENT/EMERGENCY), title, body, deepLinkRef, createdAt, readAt, deliveredChannels (JSON).

### 11.2 Module I — Calendar (single source of "when")
All dates live here: class timetable/periods, exam schedules, report-card deadlines, school holiday calendar (feeds Module C's business-day math), signage slide date windows (read-only reflection of `SignageSlide.startAt/endAt`, not a duplicate field). Same non-duplication logic applies to every other module with a date.

### 11.3 Module J — Dashboard & Widgets
Every role gets a customizable home dashboard: add/remove/reorder widgets from an approved catalog, each a thin read-only view into one owning module. Layout persists per user (`UserDashboardLayout` — userId, widgetInstances JSON: widgetType, position, size, config). Widgets never contain business logic beyond fetch/render — structurally enforcing §0.4.

### 11.4 Module K — Identity, Roles & Admin
Roles: **Teacher**, **School Admin**, **Super Admin** (project/instance maintainer), **Counselor** ("Rehberlik" — receives escalated threads per Module C), **Parent** (read-only into their child's reports/grades/flower/visible disciplinary records, messaging per Module C), **Student** (Learning Hub, gated AI Tutor, Exam Mode, Digital Notebook, gated Communication), and **DPO** (Module L, §11.8 — compliance-surface read access + gate-approval power over high-risk modules). Sponsor is not a login role — sponsor content is admin-managed only. All escalation thresholds, warning limits, kiosk toggles, and messaging rules are exposed in a single **Admin Policy Console** so a non-technical admin can tune the entire rules engine without a code change.

### 11.5 Module L — Legal, Data Protection & Rights Compliance (EU/DE)

This module governs every other module. It layers **EU GDPR (DSGVO)**, the **German Federal Data Protection Act (BDSG)**, and the **state-level School Acts (Landesschulgesetze) and School Data Protection Ordinances**, which vary across all 16 Bundesländer and often override/supplement the GDPR baseline for public schools — plus **Landespersonalvertretungsgesetz (LPVG)/BPersVG** for staff co-determination, and general child-rights principles (KJSG/UN-CRC).

**Data protection by design & default (Art. 25), applied to every module:**
- Data minimization at schema level — every optional field defaults to *not collected* (e.g., `Student.dateOfBirth` stays nullable, populated only if state rules actually require it).
- Purpose limitation — each table documents its legal basis/purpose in `docs/DATA_MODEL.md` (e.g., `ExamWarning` → exam integrity & pedagogical record; legal basis: Schulgesetz duty of fair assessment).
- Pseudonymization where feasible (e.g., `AiTutorInteraction` stores a pseudonymous reference by default).
- Storage limitation — every personal-data entity has a `retentionPolicyRef` into `DataRetentionPolicy` (below), swept by a scheduled job, never a manual "someone remembers" process.
- Access control defaults to deny — a Teacher's access to a student is scoped to classes currently taught; losing that assignment auto-narrows access.

**Special-category / sensitive data (Art. 9) — explicit flags at every touchpoint:**
- The Exam Mode **distress signal** (§8) is health-adjacent: minimal event flag only, restricted visibility, short default retention unless it escalates into a formal record.
- `DisciplinaryRecord` — highly sensitive minor data even if not technically Art. 9; same need-to-know visibility model; `visibleToParent` is a real enforced access-control flag, never just a UI toggle.
- Signage **counseling notices** (§5) never broadcast identifying detail school-wide.
- No field anywhere in the schema for race/ethnicity/religion/sexual orientation/union membership/political opinion — explicitly out of scope, permanently.

**Teacher rights & staff co-determination (Personalrat/unions):**
- Any feature capable of monitoring staff behavior or performance (`AuditLog` on teacher actions, message read-receipts, exam-monitor response-time visibility, content-approval analytics, etc.) **triggers Personalrat co-determination rights** under the relevant state LPVG (or BPersVG) — analogous to § 87(1) No. 6 BetrVG in the private sector.
- Before shipping to a real school, each such feature needs a **Dienstvereinbarung-ready spec sheet** (`docs/personalrat/<module>.md`): what's logged, who sees it, retention, and an explicit statement it won't be used for unilateral performance evaluation without Personalrat agreement.
- Recommend looping in **GEW/VBE** and the Personalrat during rollout — surfaced as a required onboarding checklist item (§11.9) before enabling any monitoring-capable module.
- Teachers get the same self-service data-export as students (reusing the one pipeline, §0.4), and a per-teacher "quiet hours" setting for non-urgent notifications (urgent/emergency alerts always bypass this by design).

**Student rights:**
- **Access (Art. 15):** full export via the one Module K export pipeline — competency entries, grades, notebook pages, messages, disciplinary records, AI Tutor interaction summaries.
- **Rectification (Art. 16):** via existing audit-logged edit flows in Module A.
- **Erasure (Art. 17), bounded by retention duties:** account/active data erasable on request or on leaving school, except records under an active `DataRetentionPolicy`; erasure response reports what was retained and why.
- **No solely-automated decisions with legal/significant effect (Art. 22):** `ComputedGrade.isFinalized` cannot become `true` without a `finalizedByUserId` (a human). Exam Mode's third-strike **pause** may be automatic (safety mechanism), but any resulting `DisciplinaryRecord` requires a human actor — never auto-generated.
- **No repurposing into a broader "risk score"** or similar — explicitly a forbidden feature (not just unbuilt), documented in `docs/ROADMAP.md`'s "will not build" section.

**Retention periods — config-driven (extends §0.2):**
- New entity **DataRetentionPolicy** — id, schoolId, dataCategory (LEARNING_PROGRESS/ASSESSMENT_RESULT/FINAL_REPORT/DISCIPLINARY_RECORD/EXAM_INCIDENT/MESSAGE/AI_TUTOR_LOG/NOTEBOOK_PAGE/SIGNAGE_LOG), retentionPeriodMonths, legalBasisNote (free text, filled by the school's DPO), reviewedByUserId, reviewedAt.
- Ship **empty of defaults** for legally-mandated categories (forces the DPO to enter their state's actual correct numbers, never a guessed default); ship **modest editable defaults** for non-mandated, product-only categories (e.g., AI Tutor log summaries ~12 months).

**Parent rights:**
- **Information duty (Art. 13/14):** plain-language privacy notice generated from the same module documentation/retention config, so it can never drift from what the system actually does.
- **Consultation/approval before rollout:** most state School Acts require **Schulkonferenz**/**Elternbeirat** consultation before new pupil-data software goes live — a literal onboarding checklist step (§11.9); no silent activation of high-impact modules (Signage emergency broadcast, Exam Mode, AI Tutor) without acknowledging this happened.
- **Access to their child's records:** grades, reports, competence flower, `visibleToParent`-flagged disciplinary entries — never paywalled or admin-discretionary in a way that would violate this right.
- **Messaging rights:** the escalation rule (§6) is a workflow-efficiency rule, never a barrier to a genuine safety concern — a parallel urgent path always bypasses the gate.

**School's rights & obligations (controller responsibilities):**
- **Controller vs. processor:** the school (via its Schulträger) is normally the data controller; a self-hosted instance run by the school itself simplifies Art. 28 needs, while a third-party-operated instance requires a signed **Art. 28 AVV** — ship a starting-draft template in `docs/legal/avv-template.md`, explicitly marked for the DPO/lawyer to finalize.
- **Records of Processing Activities (Art. 30):** `docs/legal/verzeichnis-verarbeitungstaetigkeiten.md`, generated mechanically from each module's purpose+legal-basis notes.
- **DPIA (Art. 35):** the platform plausibly meets mandatory-DPIA criteria (large-scale children's-data processing, systematic monitoring via Exam Mode, health-adjacent signals). **Modules E (AI Tutor) and F (Exam Mode) stay disabled in the Admin Policy Console until a `DpiaRecord`** (id, schoolId, moduleScope, completedAt, approvedByUserId, documentRef) exists.
- **DPO role** (Module K extension): read access to RoPA, retention policy table, DPIA records, and school-wide audit logs, plus gate-approval power over high-risk modules.

**Product-level compliance onboarding gate** — implemented as a required flow for every new school instance before real student data is usable:
1. Enter Schulträger/DPO contact details.
2. Select the Bundesland → auto-loads that state's known retention-period *prompts* (labels only, never assumed numbers) into `DataRetentionPolicy` for confirmation.
3. Log Elternbeirat/Schulkonferenz consultation status per module before it can go live for real use.
4. Log Personalrat consultation status for every monitoring-capable module.
5. Complete/upload the DPIA before Modules E and F unlock.
6. Only then does the Admin Policy Console allow those modules to leave "disabled" state.

This makes compliance a DB-driven, enforced product flow, consistent with §0.2/§0.6 — never a one-time audit forgotten after launch.

**On the `Klotzkette/claude-fuer-deutsches-recht` reference repository:** a large, community-maintained collection of Claude Code skills/prompts for German legal practice (labor, corporate, insolvency, data-protection, procedural law, plus Schulrecht/Hochschulrecht clusters), explicitly published as an experimental legal-drafting aid, not a certified compliance product. **Bounded recommended use:** consult its `datenschutzrecht` skill as a drafting assistant when preparing the AVV template, the RoPA structure, and the parent-facing privacy notice — a faster, correctly-structured first draft. **Never** treat its output (or this PRD's, or any AI's) as a substitute for sign-off by the school's actual DPO or legal counsel — every generated `docs/legal/*.md` file should carry that disclaimer as a literal header. It is a prompt/skill library, not a runtime dependency — keep it entirely out of the app's dependency tree.

---

## 12. Module M — Core AI Orchestrator (ZeroClaw)

### 12.1 Purpose

A single, self-hosted **"core brain"** service that (a) powers every AI-driven capability already specified elsewhere in this PRD (AI Tutor §8, Learning Hub content-assist §7, translation §8, report-narrative drafting §4.3) through **one** implementation instead of scattered ad hoc AI calls — consistent with §0.4's no-duplication principle — and (b) adds **automations and an assistant surface for Admin, Teachers, and Students**, reachable through the web UI, plus **event-triggered background automations (SOPs)** that keep the school running without a human having to remember every routine task.

Built on **ZeroClaw** (`zeroclaw-labs/zeroclaw`) — a self-hosted, provider-agnostic agent runtime (Rust) with: a gateway + web dashboard, pluggable LLM providers (Anthropic, OpenAI, local Ollama, ~20 others — so a school can choose a paid API or a fully local/free model), a security-first "supervised by default" autonomy model with sandboxing and cryptographic tool receipts on every action, and an event-triggered **SOP (Standard Operating Procedure) engine** (cron / webhook / MQTT-style triggers with approval gates and resumable runs). This maps cleanly onto what the school asked for: a core system that manages/oversees the project, helps admin, and helps teachers and students in various situations.

### 12.2 Non-negotiable boundary rules (extends §0 and Module L)

1. **CoreAI never talks to the database directly.** All data it needs or writes flows through the **backend's API**, using scoped, audited service credentials — never a raw DB connection. This keeps the "one write path" property from §3 intact and means every CoreAI action is subject to the exact same permission/audit-log/retention rules as a human user's action (Module K/L).
2. **CoreAI must independently enforce Module F's exam-lockdown gate.** Even though the backend already refuses AI Tutor calls during an active `DIGITAL_LOCKED` exam session (§8), CoreAI's own request handler checks the same "is this student in an active exam session?" flag before responding to any tutoring-style request — defense-in-depth, not trust-the-caller (§9's principle, restated here for the AI layer specifically).
3. **No autonomous high-stakes actions.** CoreAI runs in ZeroClaw's `supervised` autonomy mode by default for this deployment, and the following actions are **hard-configured as always requiring human approval**, never auto-executed even in a future "trusted" mode: finalizing a `ComputedGrade`, creating a `DisciplinaryRecord`, triggering an `EmergencyAlert`, sending a school-wide broadcast notification, or modifying any `EscalationPolicy`/`DataRetentionPolicy`/other Module L policy row. This mirrors Module L's Art. 22 "no solely-automated decisions" requirement (§11.5) and extends it as an engineering constraint on the agent runtime itself, not just on the grading algorithm.
4. **Every interaction is logged**, extending the existing `AiTutorInteraction` pattern (§8) into a general `CoreAiInteractionLog` (id, actorUserId, actorRole, requestType [TUTOR_HINT / CONTENT_DRAFT / TRANSLATION / ADMIN_ASSIST / TEACHER_ASSIST / SOP_RUN], promptSummary, responseSummary or actionTaken, timestamp), retained per a `DataRetentionPolicy` row like any other personal-data category (§11.5) — summary-only/pseudonymized by default, full-transcript retention as a school-configurable opt-in.
5. **Version updates are pulled deliberately, not silently.** A scheduled job checks `zeroclaw-labs/zeroclaw` GitHub releases for the latest tagged version and opens an **update-available notice** in the Admin Policy Console (§11.4) — it never auto-replaces the running container image in production without an admin approving the upgrade (rebuild/redeploy), consistent with Module L's "no silent activation of a module" philosophy (§11.9). Pin the running version explicitly in `docker-compose.yml`/the K8s `Deployment` image tag; the update job only proposes a new pin.

### 12.3 Capabilities (mapped to existing modules — no new AI logic duplicated elsewhere)

- **Student-facing (via Module E's existing hard-gated AI Tutor surface):** concept explanations, hints, translation of Learning Hub content — unchanged in policy from §8, now simply *implemented by* CoreAI instead of a bespoke integration.
- **Teacher-facing assistant:** natural-language help drafting Learning Hub resources or Signage announcement copy (still lands in `PENDING_REVIEW`/admin-approval queues per §5/§7 — CoreAI drafts, a human publishes); summarizing a student's or class's recent competency/assessment trend on request (read-only, sourced via the backend API, never a new parallel analytics store — §0.4); answering "how do I…" product-usage questions about the platform itself.
- **Admin-facing assistant:** natural-language queries over data the admin is already permitted to see via the backend API ("this week'in sınav uyarı sayısı ne kadar?", "hangi öğrenciler 30 gündür kayıt almadı?" — mirrors the existing dashboard follow-up-flag widget, §4.3), drafting (never sending) parent/staff communications, and surfacing Module L compliance status (DPIA/consultation checklist progress, §11.9) in plain language.
- **Automations (SOP engine)** — background, event-triggered, still bounded by §12.2's approval rules for anything high-stakes:
  - Scheduled reminders: upcoming report-card deadlines (Module I), pending Learning Hub review-queue items (Module D), retention-sweep due dates (Module L).
  - Anomaly flags surfaced to admin/teacher for human review (never auto-actioned): a student with an unusually high count of `ExamWarning`s in a period, a class with no `LearningProgressEntry` activity in an unusually long window, an `EscalationRequest` that just became eligible (already needs a notification per Module C — CoreAI can be the mechanism that generates and files it via the Notifications module, H, rather than a second notification path).
  - DPIA/consultation-checklist nudges for the DPO/admin during onboarding (§11.9), so the compliance gate isn't just a form nobody remembers to finish.

### 12.4 Web interface & access

- CoreAI's own ZeroClaw gateway/dashboard is **not** exposed publicly. It's reachable only from the backend container internally, and — for admin/DPO users who want direct visibility into agent memory, SOP runs, and tool-call receipts (useful for audit/trust, matching Module L's transparency goals) — through a **backend-proxied, authenticated route** embedded in the platform's own Admin section, inheriting the platform's existing auth/session/role checks rather than standing up a second login system.
- Student- and teacher-facing AI features appear as ordinary parts of the existing frontend (AI Tutor panel, "draft with AI" buttons in Learning Hub/Signage authoring, admin assistant chat panel) — the person using them never needs to know or care that ZeroClaw is the engine underneath; this keeps the UI unified per §0.4, with CoreAI purely a backend implementation detail of Module M's capabilities.

### 12.5 Data flow summary

`frontend → backend API → (backend decides: handle directly, or call coreai) → coreai (ZeroClaw agent loop, model-provider call, tool use if applicable) → response back to backend → backend applies permission/audit/approval rules → frontend`. CoreAI never receives more data than the specific request needs (principle of least data, §11.2), and never persists school records itself — its only local state is agent memory/config on its own volume plus the `CoreAiInteractionLog` it asks the backend to write on its behalf (same audited write path as everything else).

---

## 13. Global UI/UX Design System (Cross-Cutting — Not a Separate Page or Menu)

**Read this section as a mandate that applies inside every module (A–M), not as a feature area of its own.** There is no "tablet view" screen or "mobile menu" anywhere in the product — every screen in the app *is* built from one shared, device-adaptive design system from the start. A module that renders its own one-off layout, spacing scale, or button style instead of using the shared system is a bug, under the same no-duplication principle as §0.4 (which forbids duplicate *functionality*; this section forbids duplicate *visual language*).

### 13.1 Device priority (who actually uses what)

- **Tablet is the primary, default-designed-for surface** — teachers logging entries or running Exam Mode, students in the Learning Hub/Digital Notebook, all predominantly on tablets in a classroom.
- **PC/desktop is fully supported and important**, especially for Admin/office workflows (Signage authoring, Module L compliance console, bulk grading review) — but it's not assumed to be *the* primary surface; the design system must feel equally native on both, not "tablet with a desktop afterthought" or "desktop squeezed onto tablet."
- **Mobile phone** gets a constrained but fully functional layout (notifications, messaging, quick lookups) — not the design target, but never broken.
- One responsive layout engine and one component library serve all three. The same `<Card>`, `<Button>`, `<DataTable>`, etc., adapt their density/spacing per breakpoint — they are never reimplemented per device class.

### 13.2 "Feels like a native app," not "a website you're viewing on a tablet"

- Installable PWA (leveraging Workbox, §3) with a real app icon, splash screen, and standalone display mode — opening it should not look or feel like a browser tab.
- App-like navigation: a persistent primary navigation (bottom tab bar on tablet/mobile touch contexts, a persistent side rail on desktop) rather than deep menu trees or breadcrumb-only navigation — a teacher moving between "my classes," "notifications," "calendar," and "messages" should never be more than one tap away from any of them.
- Smooth, purposeful transitions between views (not jarring full-page reloads) and consistent, immediate feedback on every touch interaction (pressed/loading/success/error states defined once in the design system and reused everywhere — never a module-specific spinner or toast style).
- Gesture support where it aids the primary tablet workflows (e.g., swipe to move between students in a class roster while logging entries) — but never as the *only* way to perform an action; always paired with an explicit tappable control for accessibility.
- Genuinely large, confident touch targets (44×44pt minimum, larger on primary actions like exam controls and entry-logging buttons) and generous spacing at the tablet breakpoint; the desktop breakpoint is allowed to be denser (smaller controls, more columns, hover states, keyboard shortcuts) since a mouse/keyboard user has different ergonomics — same system, different calibration, documented explicitly per breakpoint in `docs/DESIGN_SYSTEM.md`.

### 13.3 Professional, modern, deliberate — not a generic admin-panel template

- A real design-token set (color palette, type scale, spacing scale, elevation/shadow system, motion/easing curves, iconography) defined once and documented in `docs/DESIGN_SYSTEM.md`, not scattered inline Tailwind classes reinvented per screen.
- Original visual identity — no reuse of Digidoo's illustrations, palette, or copy (§1); a distinct, warm, education-appropriate accent color and a typeface pairing chosen deliberately, not left at framework defaults. The result should read as a considered, purpose-built product, not an unstyled shadcn/ui scaffold or a generic SaaS-admin-template look.
- Consistent empty states, loading states, and error states — designed once, reused everywhere (a new module never invents its own "no data yet" illustration or wording style).
- Dark mode is a reasonable stretch goal (not MVP-required) but if built, is a token-level theme swap, not a second parallel set of hand-styled screens.
- Full keyboard navigation and screen-reader labels (WCAG 2.1 AA target) built into the shared component library itself, so every module inherits accessibility correctly by construction rather than needing to re-implement it — extended specifically to Signage (legible from a distance) and Exam Mode (usable with assistive tech even inside lockdown, §9).

### 13.4 How this is enforced, not just aspired to

- Ship a **shared component library** (shadcn/ui as the base, customized per §13.3's tokens) as its own package inside the frontend container's codebase; every module imports from it — no module-local component duplicates.
- Maintain `docs/DESIGN_SYSTEM.md` as the single source of truth for tokens, breakpoints, and component usage patterns, and a component-preview environment (e.g., Storybook or an equivalent lightweight catalog) so contributors can see and reuse existing components before building a new one — checking this catalog before adding a component is a step in the same "check whether it already exists" discipline as §0.4.
- Empty states and an onboarding checklist for a brand-new school ("1. Create your first class → 2. Assign a competency grid → 3. Add students → 4. Log your first entry") are themselves built from the shared empty-state/checklist components, not a bespoke one-off page.
- Free browser push notifications via the Web Push API (no paid vendor required) follow the same shared notification-UI pattern everywhere they surface (Module H).
- German and English complete from day one (`next-intl` or equivalent); default German (DACH audience), English complete since this is an open project others may adopt — all copy flows through the same i18n system so no module ships hardcoded, untranslated strings.

---

## 14. Non-Functional Requirements

- **Self-hostability:** one `docker-compose.yml`, one `.env.example`, a `README.md` a non-expert school IT person can follow — target under 10 commands from `git clone` to a running app.
- **Performance:** SQLite + server-rendered pages where sensible; paginate long lists (rosters, entry timelines).
- **Backups:** documented, scripted daily backup (cron copying the SQLite file + files directory); consider `litestream`; document SQLite's concurrent-write limits and when a school should be advised to migrate to Postgres.
- **Security:** Zod (or equivalent) input validation at every API boundary, parameterized queries only, secure cookie flags, rate limiting on auth endpoints, dependency vulnerability scanning in CI. Exam Mode integrity is defense-in-depth (Module F, §9). Emergency Alerts (§5) need the lowest possible latency path, treated as fire-drill-grade reliability, with explicit failure/retry testing.
- **Data minimization:** AI Tutor logging defaults to summary-only (§8); Digital Notebook stroke data is exportable/erasable like any other student record (§11.5).
- **Accessibility:** WCAG 2.1 AA across all modules.
- **CI/CD:** GitHub Actions running lint, typecheck, unit tests, E2E smoke tests on every PR.

---

## 15. Project Structure (suggested — monorepo housing all four containers)

```
/frontend            # React/Next.js container
  /app or /src
  /components         # shared design-system component library (§13.4) — every module imports from here
  /public
  Dockerfile

/backend             # API/business-logic container — the only DB + CoreAI caller
  /src
    /api
    /db              # Prisma/Drizzle client, schema (talks to db container/SQLite-or-libSQL)
    /grading         # pure grading calculation functions + tests
    /reports         # report generation + PDF rendering
    /permissions     # authorization helpers
    /compliance      # retention sweeps, DPIA gate checks, RoPA generation, onboarding gate (§11.9)
    /coreai-client    # typed client for calling the coreai container's API (§12.5)
  /prisma (or /drizzle)
    schema.prisma
    seed.ts
    migrations/
  Dockerfile

/db                   # SQLite-file mode config for docker-compose, OR libSQL/`sqld` server config for K8s mode
  Dockerfile (or reference upstream sqld image)

/coreai               # ZeroClaw-based container (Module M)
  config/             # ZeroClaw TOML config (providers, agent aliases, SOPs, autonomy/risk profile)
  sops/                # SOP definitions (reminders, anomaly flags, DPIA nudges — §12.3)
  Dockerfile

/k8s                  # Kubernetes manifests (or Helm chart) — Deployments/StatefulSet/Services/Ingress/NetworkPolicy per §3.1
  frontend/
  backend/
  db/
  coreai/

/docs
  ARCHITECTURE.md      # four-container boundary rules, stack rationale, self-hosting + K8s paths
  SELF_HOSTING.md
  DATA_MODEL.md        # ER diagram + entity descriptions + purpose/legal-basis notes
  DESIGN_SYSTEM.md     # tokens, breakpoints, component usage patterns (§13.4)
  CONTRIBUTING.md
  ROADMAP.md            # incl. explicit "will not build" section
  /legal
    avv-template.md
    verzeichnis-verarbeitungstaetigkeiten.md
  /personalrat
    <module>.md          # co-determination spec sheets per monitoring-capable module

/tests
  unit/
  e2e/                  # incl. cross-container flows: frontend → backend → coreai

docker-compose.yml      # four services: frontend, backend, db, coreai
.env.example
README.md
LICENSE                 # custom SchulOS license: free to copy/use, no-sale, revenue → environmental-protection donation (§0)
```

---

## 16. Revised MVP Phasing

Given the scope, ship in **stages**, each fully functional and demo-able:

**Stage 1 — Foundation:** Identity/roles/schools/classes/students, Module A (Academics Core) end-to-end, Calendar (Module I) as the shared date backbone, Notifications (Module H) skeleton, Dashboard/Widgets (Module J, 2–3 widgets), the **compliance foundation** (`DataRetentionPolicy` table, `docs/DATA_MODEL.md` purpose/legal-basis notes, onboarding gate skeleton — §11.9 steps 1–2), and the **four-container skeleton itself**: frontend/backend/db split into their own containers with the docker-compose (and a first-pass `/k8s` manifest set) working end-to-end for Stage 1's features before any other module is added — this is the point to validate the container/network boundaries (§3, §3.1) are right, since every later stage builds on them.

**Stage 2 — Communication & Signage:** Module C in full (messaging, escalation policy engine, social rooms, class lock, the urgent-safety bypass path), Module B (signage, including Emergency Alert override), wired into Module H/I. Add onboarding gate steps 3–4 (Elternbeirat/Schulkonferenz and Personalrat consultation logging) since Module C introduces monitoring-adjacent surfaces (read receipts, audit trail).

**Stage 3 — Learning, AI & CoreAI:** the **coreai container is introduced here** (Module M, §12) — bring it up with only the lowest-risk capabilities first: teacher/admin content-drafting assist (§7) and simple scheduled reminders (§12.3), both already human-review-gated by their owning modules. Then Module D (Learning Hub, manual authoring first, AI-assist fast-follow through CoreAI), then Module E (AI Tutor through CoreAI, with hard test-time gating enforced at **both** the backend and CoreAI layers from day one — never ship before Module F's gate exists, and never ship CoreAI's admin/teacher assistant capabilities that touch grading, discipline, or broadcast messaging before §12.2's approval-required rules are actually enforced in code). DPIA gate (§11.9 step 5) must be functional before Module E — or any CoreAI capability that processes student data — can be enabled for real use.

**Stage 4 — Exam Mode & Digital Notebook:** Module F (kiosk lockdown, warnings, monitor view) and Module G (typed + stylus notebook, teacher annotation) — highest-integrity/most device-sensitive modules, saved for last so the touch/kiosk foundation is mature first, and gated behind the completed DPIA per §11.9.

Each stage gets its own seed data, test-suite additions, and `docs/ROADMAP.md` entry.

---

## 17. Definition of Done (MVP + full platform)

**Core functionality (per module, §4–10):**
1. Auth (register/login/reset, optional 2FA) end-to-end.
2. School → SchoolYear → ClassGroup → Student → Enrollment CRUD with CSV import.
3. At least 2 seeded starter competency templates with categories, competencies, and a mastery scale.
4. Template assign/clone + school-copy editing.
5. Fast entry-logging UI from a class roster.
6. Assessments with bulk grid entry.
7. Competence Flower radar chart, computed from real data, configurable aggregation.
8. Grading scheme + weight rules + computed grade with breakdown + manual override (human-finalized only, §11.5).
9. Report generation (draft → final → PDF), single and bulk export.
10. Data export (JSON/CSV) and erasure flow, audit-logged, unified across student/teacher/parent (§11.5).
11. i18n scaffolding, DE + EN complete for implemented screens.
12. Dockerized self-hosting + docs, seed script for demo data.
13. Signage with working Emergency Alert override.
14. Communication with the full escalation-policy engine and urgent-safety bypass.
15. Learning Hub with at least manual (non-AI) content authoring functional.
16. AI Tutor shipped only after Exam Mode's server-side gate exists and is tested.
17. Exam Mode with the full bathroom/distress/warning flow and defense-in-depth enforcement.
18. Digital Notebook with typed + stylus input and non-destructive teacher annotation.
19. CoreAI (Module M) running as its own container, reachable only through the backend, with §12.2's approval-required action list actually enforced in code (verified by a specific test, not just documented), and the version-update job proposing (never silently applying) new ZeroClaw releases.
20. Four-container architecture (frontend/backend/db/coreai) working via both `docker-compose.yml` and the `/k8s` manifest set, with `NetworkPolicy`/equivalent boundary rules from §3.1 actually in place, not just documented.
21. Every screen across every module built from the single shared design-system component library (§13), with `docs/DESIGN_SYSTEM.md` accurate and a working component-preview catalog — spot-checked by picking three unrelated modules (e.g., Signage authoring, the AI Tutor panel, and Module L's compliance console) and confirming they share identical button/card/spacing/typography treatment, not three different visual languages.
22. Test suite: unit tests for grading logic, permissions, and the escalation-policy business-day calculator specifically (not just an overall coverage %); Playwright E2E covering register → create class → assign template → add students → log entries → generate report, plus a signage-emergency-override smoke test, an exam-session lifecycle smoke test, and a CoreAI smoke test (a teacher content-draft request round-trips through backend → coreai → backend correctly, and an AI Tutor request during an active exam session is correctly refused by CoreAI even if a test double bypasses the backend's own gate).

**Compliance (Module L, §11.5) — a school instance is not production-ready until:**
- [ ] `docs/DATA_MODEL.md` has a purpose + legal-basis note for every personal-data entity.
- [ ] `DataRetentionPolicy` rows exist (school-confirmed, not defaulted) for every legally-mandated category.
- [ ] `docs/legal/verzeichnis-verarbeitungstaetigkeiten.md` (RoPA) generated and reviewed.
- [ ] AVV signed (third-party-operated instance) or explicitly marked not-applicable (self-hosted-by-school).
- [ ] DPIA completed and on file before Modules E or F are enabled.
- [ ] Elternbeirat/Schulkonferenz consultation logged per module.
- [ ] Personalrat consultation logged for every monitoring-capable module.
- [ ] Student/parent/teacher self-service data-export flows tested end-to-end.
- [ ] Privacy notice generator produces an accurate, plain-language notice matching actual configured retention periods (no drift between docs and DB config).

`README.md` should state SchulOS's mission plainly: a free tool built by DFM Solutions and family, to help protect the environment and reduce paper/print dependency in schools; explain the license (free to use, no-sale, revenue-to-environmental-donation, §0); and explain how to contribute.

---

## 18. Phase 2 / Stretch Goals (out of scope for v1 — document in `docs/ROADMAP.md`)

- SSO (OIDC) support for schools with existing identity providers.
- Optional Postgres deployment mode for larger multi-school instances.
- Native offline-first PWA mode for spotty classroom Wi-Fi.
- **Explicitly forbidden, not just deferred (§11.5):** any feature that repurposes competency/AI-Tutor/behavioral data into a cross-context "student risk score" or similar profiling construct without a wholly separate legal basis and DPIA.

---

## 19. Instructions for the AI Coding Agent

1. Produce `docs/ARCHITECTURE.md` and the **full** Prisma/Drizzle schema (all entities across §4–11) and get sign-off before writing app code — this schema is large enough that an early wrong decision is expensive.
2. Build the shared **Policy/Config layer** (backing the Admin Policy Console, §11.4, and `DataRetentionPolicy`, §11.5) **before** implementing Module C's escalation logic or Module F's warning thresholds — both must read from it, proving "no hardcoding" structurally, not just by discipline.
3. Build Module H (Notifications) and Module I (Calendar) early, in Stage 1, precisely because every later module depends on them — prevents each module from inventing its own notification/date logic.
4. When implementing Module F, write the **server-side session-gating check** before the kiosk UI — the security/integrity property must not depend on the UI shipping correctly.
5. Flag explicitly, in `docs/DATA_MODEL.md`, every place a rule/threshold/retention-period is read from a policy table, and every entity's purpose + legal basis (so a future compliance audit can confirm zero hardcoded business rules and a complete RoPA).
6. Never enable Module E or F for a school instance until the corresponding onboarding-gate step (§11.9) is satisfied — build this as an actual code-level check, not a documented process someone might skip.
7. Keep commits small and descriptive; maintain a CHANGELOG. After each feature, write its unit/E2E tests before moving to the next.
8. Flag any point where a competency/grading/retention policy varies by German Bundesland — expose it as configuration, never hardcode one state's rules, and note the assumption in `docs/DATA_MODEL.md`.
9. Remember throughout: **this is a free, non-commercial, donation-supported school project.** Prefer boring, dependency-light, self-hostable solutions over anything introducing a paid third-party service or vendor lock-in — and treat every compliance requirement in §11 as a hard constraint, not a stretch goal.
10. When implementing Module M (§12), build the backend↔coreai API contract and the **approval-required action list (§12.2)** before wiring up any actual model-provider call — the boundary/safety layer must exist before the "smart" part does, mirroring instruction #4's approach to Module F.
11. Pull `zeroclaw-labs/zeroclaw` at a pinned, explicitly-chosen release tag — never track `master`/latest automatically in a running deployment (§12.2's version-update rule) — and adapt its `deploy-k8s/` reference manifests for the coreai container rather than writing Kubernetes YAML from scratch.
12. Build the shared design-system component library (§13.4) — tokens, breakpoints, the base component set — **before** building any individual module's screens, and build every module's UI exclusively from it. Treat a module that introduces its own one-off button/card/spacing style as a defect to fix immediately, not a style-guide suggestion for later.