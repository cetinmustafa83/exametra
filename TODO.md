# SchoolOS PRD Execution Plan

Last reviewed: 2026-08-02

## Operating Rules

- [x] Use SQLite with Prisma for core relational data.
- [x] Keep all server-side access checks deny-by-default and scope teachers to currently assigned classes.
- [x] Keep student data restricted to the linked student record; restrict parent data to `ParentStudentLink` children.
- [x] Prevent Vice Principals from managing administrator accounts.
- [ ] Move every configurable policy, threshold, retention period, warning limit, and escalation window into database-backed school policy records. No new business-rule literals may be introduced.
- [ ] Every new API route must have authorization, school scope, input validation, audit logging where it mutates personal or grading data, and tests.
- [ ] Keep all dates/deadlines in Calendar as the canonical source; other pages can show only read-only summaries sourced from Calendar.
- [ ] Keep notifications in the Notification module as the single delivery pipeline; feature modules emit notifications rather than creating independent alert systems.
- [ ] Do not use emojis in product UI, seed-visible UI, navigation, documentation examples, or new copy. Use Lucide icons already present in the project.
- [ ] Preserve the existing emerald/teal brand palette and semantic colors defined in `src/app/globals.css`.
- [ ] Use one shared motion vocabulary: 160-220ms hover/focus feedback, 220-320ms panel/state transitions, opacity/transform only, and `prefers-reduced-motion` fallbacks.
- [ ] New dashboards use responsive Bento grids. Widgets are read-only views of their owning module and must not duplicate workflows.

## Definition Of Done

- [ ] `pnpm lint`, `pnpm test`, `pnpm typecheck`, and E2E smoke tests pass.
- [ ] A feature has server-side authorization tests including cross-school IDOR attempts.
- [ ] A feature has i18n coverage in German and English with no new hardcoded UI strings.
- [ ] Mobile/tablet interaction meets 44x44px minimum target size and keyboard/screen-reader requirements.
- [ ] Documentation, migration, seed behavior, audit logging, and retention implications are updated.

## Completed Foundation

- [x] Next.js, TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, Recharts, and DE/EN i18n scaffold exist.
- [x] Core school, year, class, enrollment, student, subject, competency, progress, assessment, grading, reporting, audit, export, and soft-delete models exist.
- [x] Competency templates, entries, assessments, grading schemes, computed grades, competence flower views, report card screens, data export, and GDPR/compliance models exist.
- [x] Student/parent/teacher/admin API scope hardening has been applied across major academic, personal, operational, sensitive-data, and report endpoints.
- [x] Role-safe communication, leave approval, teacher absence, calendar, and escalation baseline workflows exist.
- [x] Compliance models exist: `DataRetentionPolicy`, `DpiaRecord`, `ComplianceConsultation`, `SchoolComplianceStatus`, and `DeletionFlag`.
- [x] Basic signage, exam, notification, dashboard widget, and notebook models/views exist.
- [x] Seed scripts and `.env.example` exist.
- [x] Current checks pass: lint, unit policy tests, build-first typecheck, and production build.

## Information Architecture And Navigation Consolidation

### Canonical Top-Level Navigation

Use these sections only. Do not add a new sidebar entry if a workflow belongs in an existing page tab.

- [ ] Home
  - Dashboard only. Role-specific Bento widgets, quick actions, unread notifications, and read-only upcoming calendar summary.
- [ ] Teach
  - Classes, Students, Competencies, Progress, Assessments, Grading, Reports, Attendance, Homework, Lesson Plans, Resources, Digital Notebook.
- [ ] School Life
  - Calendar, Communication, Announcements, Events, Library, Transport, Wellness, Counseling, Discipline, Substitutions.
- [ ] Insights
  - Competence Flower, Mastery Matrix, Analytics, Curriculum Coverage, Grade Analytics, Data Export.
- [ ] Administration
  - Users/Roles, School Setup, Policies, Compliance, Imports, Backups, Signage, Settings.

### Required Page Ownership And Tab Consolidation

- [ ] `Classes` owns class setup and roster. Tabs: Overview, Students, Subjects, Staff, Timetable, Seating, Attendance, Competencies.
- [ ] `Student Detail` owns an individual student record. Tabs: Overview, Progress, Assessments, Reports, Attendance, Wellbeing, Goals, Notebook, Portfolio, Support. Do not expose the same student workflows as independent menu pages.
- [ ] `Assessments` owns authoring, competency links, results grid, review, and Exam Mode launch. Tabs: Assessments, Results, Rubrics, Peer/Self Assessment, Exam Sessions.
- [ ] `Reports` owns report drafts, review, finalization, PDF/ZIP exports, and report templates. Tabs: Drafts, Finalized, Templates, Export Queue.
- [ ] `Communication` owns direct threads, class/grade rooms, announcements, escalation queue, and messaging locks. Tabs: Inbox, Groups, Escalations, Announcements, Locks.
- [ ] `Calendar` owns all deadlines, events, exam schedules, absences, timetable reflection, holidays, and availability. Tabs: Calendar, Timetable, Absences, Exam Dates, School Events, Holidays.
- [ ] `Resources` owns Learning Hub content. Tabs: Browse, My Class Resources, Worksheets, Vocabulary, Games, Review Queue.
- [ ] `Administration > Policies` owns permission policies, escalation policies, warning thresholds, quiet hours, module flags, and retention settings.
- [ ] Remove or fold duplicate sidebar entries after each consolidated page is delivered. Update role access lists and command palette at the same time.

## Phase 18 - Delivery, Security, And Maintainer Baseline

- [x] Add `Dockerfile` and `docker-compose.yml` with persistent volumes for SQLite, generated exports, uploads, and backups.
- [x] Expand `.env.example` with database path, public base URL, mail/reset configuration, storage path, backup path, feature flags, and optional AI configuration.
- [x] Add `docs/DATA_MODEL.md`, `docs/CONTRIBUTING.md`, and `docs/ROADMAP.md`.
- [x] Add `docs/ARCHITECTURE.md` and `docs/SELF_HOSTING.md`.
- [x] Move the root PRD to `docs/PRD.md` and keep one canonical index in `docs/README.md`.
- [x] Add GitHub Actions for lint, typecheck, unit tests, Prisma validation, migration drift checks, and Playwright smoke tests.
- [ ] Add dependency audit and secret scanning in CI.
- [x] Replace `bcryptjs` password hashing with Argon2id and document a safe rehash-on-login migration path. Legacy bcrypt hashes verify once and rehash on successful login.
- [x] Implement password reset tokens, email verification/self-hosted bypass flag, configurable session expiry, optional TOTP setup/recovery codes, and rate-limited auth routes.
- [x] Implement central origin-based CSRF protection for cookie-authenticated mutation requests below `/api/`.
- [x] Add real local file storage abstraction for uploads, exports, and backups with path traversal protection. S3-compatible adapter remains a future implementation behind the same interface.
- [x] Add SQLite WAL configuration and verified online backup scripts. Restore remains a deliberate maintenance-environment workflow and requires a smoke test before production cutover.

Exit criteria:

- [ ] A non-technical school admin can deploy from clone to login in under 10 documented commands.
- [ ] Authentication tests cover login rate limits, reset flow, session expiry, CSRF rejection, and TOTP when enabled.
- [ ] Backups are real files, restore into a disposable database is verified, and no endpoint returns a fake restore acknowledgment.

## Phase 19 - Policy And Permission Engine

- [ ] Create `SchoolPolicy`, `EscalationPolicy`, `ClassMessagingLock`, module activation, quiet-hours, warning-limit, and holiday/calendar policy tables.
- [ ] Replace hardcoded escalation days, weekend calculation, XP constants, leave types, notification thresholds, and warning counts with policy/config queries.
- [ ] Implement a centralized policy service with cached, scoped school configuration and explicit fallback behavior for missing required policy rows.
- [ ] Add an Admin Policy Console with tabs: Access, Communication, Exams, Notifications, Retention, Modules, School Calendar.
- [ ] Add DPO read/gate permissions without granting ordinary user administration.
- [ ] Add policy change audit records with before/after value, actor, reason, and effective time.
- [ ] Use holiday records from Calendar to calculate business days; do not assume Mon-Fri alone.
- [ ] Implement the urgent safety path that bypasses normal communication escalation while preserving audit and notification traceability.

Exit criteria:

- [ ] An administrator can change each PRD-configurable rule without deployment.
- [ ] Policy unit tests cover missing policies, precedence, school isolation, holidays, overrides, and emergency bypass.

## Phase 20 - Navigation, Design System, And Dashboards

- [ ] Refactor `app-layout.tsx` sidebar and command palette into the canonical five navigation sections.
- [ ] Remove duplicate or overlapping navigation items after moving their workflows to canonical page tabs.
- [ ] Create shared page-shell primitives: `PageHeader`, `PageTabs`, `BentoGrid`, `BentoWidget`, `ModuleEmptyState`, `PermissionEmptyState`, and `LoadingSkeleton`.
- [ ] Create a single icon registry based on Lucide. Remove any emoji-based UI affordances and prohibit adding new ones.
- [ ] Add shared animation tokens/utilities and reduced-motion behavior; remove inconsistent bespoke animations from feature pages during touch work.
- [ ] Rebuild Dashboard as role-aware Bento grid with persisted widget configuration, not duplicated business logic.
- [ ] Dashboard widget catalog: My Classes, Follow-up Students, Upcoming Calendar, Pending Approvals, Notifications, Exam Monitor, Report Deadlines, Compliance Gate, Resource Review Queue.
- [ ] Give every role a narrow dashboard: teacher classroom operations, parent child summary, student personal learning, vice principal operational oversight, admin governance, DPO compliance.
- [ ] Standardize tablet layout, touch targets, focus order, screen-reader labels, density, cards, tabs, tables, dialogs, and empty/error states.

Exit criteria:

- [ ] No workflow is reachable from more than one sidebar item.
- [ ] Every duplicate workflow has one canonical owner and optional read-only dashboard summaries only.
- [ ] Desktop, tablet, and mobile visual tests cover every top-level navigation section.

## Phase 21 - Academics Core Completion

- [ ] Ensure template assignment clones categories, competencies, and mastery definitions atomically into a school-owned editable copy.
- [ ] Add explicit clone version/history and prevent global-template mutations by school editors.
- [ ] Build roster-first fast entry flow: keyboard-first, tablet-first, under three interactions for the common entry case.
- [ ] Implement append-only progress entries with configurable original-author edit window and immutable audit history.
- [ ] Add configurable competence flower aggregation per template: latest, average of last N, weighted recency.
- [ ] Add flower drilldown to source entries and PNG/SVG export.
- [ ] Complete assessments: delivery mode, competency links, bulk results grid, validation, and class enrollment consistency checks.
- [ ] Move grade computation into a pure tested service with transparent per-rule breakdown.
- [ ] Add `finalizedByUserId`, finalization time, mandatory teacher confirmation, and immutable final-grade audit semantics.
- [ ] Handle grade edge cases: missing inputs, verbal-only scales, partial enrollment, override reason, and school-specific grade scales.
- [ ] Complete report lifecycle: Draft -> Review -> Final -> Versioned, locked final records, revision workflow, data-driven phrase templates.
- [ ] Implement real A4 PDF output, school branding, optional flower/notebook appendix, single download, and ZIP class export.

Exit criteria:

- [ ] A teacher can create a class, clone a template, add entries, enter an assessment grid, inspect flower evidence, compute/finalize grades, and export one or many reports.
- [ ] Grading unit tests cover deterministic breakdown and edge cases.

## Phase 22 - Communication And Notification Completion

- [ ] Replace `CommunicationRoom`-only escalation behavior with policy-backed `EscalationPolicy` and `EscalationRequest` records.
- [ ] Implement class, grade-level, and custom moderated social rooms with real membership and content moderation states.
- [ ] Implement class-hours messaging lock using Calendar/Timetable period boundaries; urgent messages still deliver.
- [ ] Add message read receipts, attachments through the storage abstraction, moderation queue, and retention references.
- [ ] Add counselor role/department routing for eligible student escalations.
- [ ] Provide an administrator case override with reason/audit trail.
- [ ] Centralize all notifications into one delivery pipeline: in-app center, browser push, email fallback where configured, quiet hours, emergency bypass.
- [ ] Remove duplicate feature-specific notification UI; retain only contextual status banners plus the central notification center.
- [ ] Add notification preference and delivery failure/retry observability.

Exit criteria:

- [ ] Parent/student escalation uses a database policy and a holiday-aware deadline.
- [ ] Teachers message management directly; emergency contact is always available without escalation.
- [ ] One notification pipeline delivers all module events.

## Phase 23 - Calendar, Leave, Attendance, And School Operations

- [ ] Make Calendar the canonical event store for absences, exams, report deadlines, timetable, holidays, school events, and signage date windows.
- [ ] Add explicit event audience/visibility relation for student, parent, class, staff, and administrator-private events.
- [ ] Finish student leave workflow with evidence files, parent verification, teacher workflow queue, final admin approval, calendar publication, and auditable rejection reasons.
- [ ] Finish teacher leave workflow with vice-principal notification, private admin notes, class coverage link, and calendar audience controls.
- [ ] Add school holiday management and use it in escalation, attendance, reporting, and timetable computations.
- [ ] Consolidate attendance, illness, leave, and timetable visibility into Calendar tabs; keep data entry routes canonical.
- [ ] Complete substitutions: absence -> available substitute search -> assignment -> timetable/calendar reflection -> notifications.
- [ ] Complete transport and library operational flows with real permissions, return/overdue state, and audit records.

Exit criteria:

- [ ] No page stores a second independent date/deadline implementation.
- [ ] Every absence and approved leave has one linked calendar record with audience-aware visibility.

## Phase 24 - Learning Hub, AI Tutor, And Content Governance

- [ ] Replace generic `Resource` semantics with PRD-aligned resource types, review status, competency links, ownership, and school/global library behavior.
- [ ] Add worksheet solution access rules and PDF worksheet export with teacher-controlled solution inclusion.
- [ ] Add vocabulary sets/items with spaced repetition, student progress, and teacher assignment surfaces.
- [ ] Add game progress scoped by student, subject, and school; exclude addictive/profiling mechanics.
- [ ] Add resource search/filter by subject, grade, competency, and review status; surface weak-competency recommendations from the flower.
- [ ] Add AI content authoring queue: every AI draft is `PENDING_REVIEW`, never directly published.
- [ ] Add `AiTutorInteraction` with pseudonymous/summary-only default logging, retention link, consent/config setting, and audit access.
- [ ] Build server-side AI Tutor safety gate: deny when active digital exam session exists; enforce homework/assessment hint-only policy with structured request context.
- [ ] Add translation requests labeled AI-translated, review reporting, and no persistent language/ethnicity profiling.
- [ ] Keep AI provider/storage optional and local-first; do not require third-party paid services for core operation.

Exit criteria:

- [ ] AI Tutor cannot answer during an active locked exam even with a direct API request.
- [ ] AI-generated content cannot become visible before human review.

## Phase 25 - Exam Mode, PWA, And Digital Notebook

- [ ] Add `ExamIncidentEvent` model and complete exam lifecycle states, device IDs, reasons, teacher actions, and parent/admin visibility rules.
- [ ] Implement server-side active-exam middleware that blocks AI Tutor, Learning Hub assistance, and ordinary messaging APIs for that student.
- [ ] Build live teacher exam monitor with pause, resume, cancel, bathroom approval, distress handling, warning issuance, and incident timeline.
- [ ] Make third warning auto-pause only; require a human for any disciplinary record creation.
- [ ] Implement fullscreen/kiosk UX with accessibility fallback and documented browser limitations.
- [ ] Add Workbox service worker for offline shell, push delivery, navigation handling, and installable PWA behavior.
- [ ] Add notebook templates, typed blocks, structured stylus stroke data, non-destructive teacher annotations, page history, subject/year organization, and PDF export.
- [ ] Use worker offloading for costly stroke/image operations only after profiling; keep a no-worker fallback.

Exit criteria:

- [ ] Exam API integrity remains enforced if the client bypasses fullscreen.
- [ ] Notebook annotations never overwrite original student work.

## Phase 26 - Signage, Emergency, And Reliability

- [ ] Align signage schema with display, slide, playlist, approval, priority, date-window, and rotation requirements.
- [ ] Add teacher slide request queue; only policy-authorized content may publish.
- [ ] Implement emergency alerts as highest-priority display override with explicit resolve action and audit record.
- [ ] Send emergency notifications to configured staff/student/parent audiences with retry/failure telemetry.
- [ ] Implement staff-only counseling notice with no student identifying detail on public displays.
- [ ] Add signage display endpoint suitable for TV devices and test offline/reconnect behavior.

Exit criteria:

- [ ] Emergency alert override is independently tested for display, notification delivery, resolution, and audit logging.

## Phase 27 - Compliance, Rights, And Retention Completion

- [ ] Document purpose and legal basis for every personal-data entity in `docs/DATA_MODEL.md`.
- [ ] Add entity-to-retention-category mapping and scheduled retention sweep using `DataRetentionPolicy` rows.
- [ ] Ensure legally mandated retention values have no guessed defaults; require DPO/school confirmation before use.
- [ ] Complete unified staff/student/parent self-service export including messages, notebooks, progress, reports, permitted disciplinary records, and generated files.
- [ ] Complete partial erasure with retained-record explanation, file deletion, audit trail, and DPO approval where required.
- [ ] Generate RoPA from module/entity metadata and keep `docs/legal/verzeichnis-verarbeitungstaetigkeiten.md` reproducible.
- [ ] Make privacy notice generator derive configured retention and module states; include non-legal-advice disclaimer.
- [ ] Gate high-risk AI Tutor and Exam Mode activation on DPO/DPIA records and onboarding consultations.
- [ ] Add Personalrat module checklist/spec sheets describing monitoring, viewers, retention, and prohibited performance-evaluation use.
- [ ] Add module-level consultation status for DPO, Schultrager, Elternbeirat/Schulkonferenz, and Personalrat.

Exit criteria:

- [ ] High-risk modules cannot activate without the configured compliance gate.
- [ ] Export/erasure and retention workflows have end-to-end tests.

## Phase 28 - Testing, Accessibility, And Release Readiness

- [ ] Add unit tests for policy engine, authorization, business-day calculation with holidays, grading engine, report phrase generation, retention sweep, and exam gates.
- [ ] Add API IDOR matrix tests for each protected school/student/class resource and all roles.
- [ ] Add Playwright E2E: register/login, class setup, template clone, student import, progress entry, assessment grid, grade finalization, report PDF, parent portal, escalation, leave approval, exam gate.
- [ ] Add visual regression coverage for each canonical navigation page at desktop, tablet, and mobile breakpoints.
- [ ] Audit WCAG 2.1 AA: keyboard navigation, focus order, labels, dialogs, contrast, motion reduction, touch targets, table alternatives, and screen-reader announcements.
- [ ] Add performance budgets for roster, dashboard, flower, report generation, and tablet entry flows.
- [ ] Add production readiness review: migrations, seed behavior, backup restore drill, Docker deployment drill, no mock data in shipped UI, and license decision.
- [ ] Add `CHANGELOG.md` in `docs/` and release/version workflow.

Exit criteria:

- [ ] CI runs lint, typecheck, Prisma validation, unit tests, security checks, and Playwright smoke tests on every pull request.
- [ ] A clean environment can seed, deploy, back up, restore, and execute the critical teacher/parent/student paths.

## Suggested Execution Order

1. Phase 18: delivery/security baseline.
2. Phase 19: policy engine.
3. Phase 20: navigation/design system/dashboard consolidation.
4. Phase 21: academics completion.
5. Phase 22 and Phase 23 in parallel after policy/calendar primitives exist.
6. Phase 24 after policy, notification, and retention primitives exist.
7. Phase 25 after AI exam gate and PWA foundations are ready.
8. Phase 26 after notification reliability is proven.
9. Phase 27 throughout, with final compliance gates before release.
10. Phase 28 continuously, with final release gate after all feature phases.

## Current Blockers

- [ ] Confirm AGPLv3 versus MIT license direction.
- [ ] Confirm whether AI features remain optional and which local/provider integration is permitted.
- [ ] Confirm school-specific legal retention values with the DPO; do not infer them.
- [ ] Confirm emergency alert audience and after-hours teacher notification policy with school leadership.
- [ ] Confirm target browser/device policy for kiosk/fullscreen limitations.
