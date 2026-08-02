# BUILD PROMPT: "CompetenceTrack" — A Free, Open-Source School Competency & Grading Platform (Digidoo Clone)

## 0. Context & Mission

You are building a full-stack web application called **CompetenceTrack** (working name — feel free to suggest alternatives). It is a **free, open-source, donation-funded school project**, inspired by the commercial product **Digidoo** (digidoo.com). The goal is to give teachers a digital tool to:

1. Track student **competencies** ("Kompetenzraster" / competency grids) instead of paper checklists.
2. Link individual **assessments/performance checks** to specific competencies.
3. Visualize each student's progress with a **radar/flower chart ("Competence Flower")**.
4. Auto-generate **report cards / progress reports** with one click.
5. Optionally calculate **grades** from weighted competencies and assessments.

This project is **not for profit** — it will be given away for free to schools, and any support the project receives will go toward the school. Because of this:
- No paid tiers, no license checks, no telemetry/tracking, no vendor lock-in.
- Prioritize **simplicity, low hosting cost, and easy self-hosting** (a school or a single teacher should be able to run this on a small VPS or even a Raspberry Pi).
- Database must be **SQLite** (see §4) — no external DB server required.
- Code must be clean, well-documented, and easy for future student/volunteer contributors to maintain.

---

## 1. Reference Product Analysis (what we are learning from, NOT copying verbatim)

Digidoo (https://www.digidoo.com/de/) is a German/Austrian EdTech SaaS. Do **not** copy their branding, illustrations, exact wording, logo, or any copyrighted text/images — this must be an original UI/UX and original copywriting, only inspired by the **feature set and workflow concept**. Core concepts observed on their site that we want to reproduce functionally:

- **Competency grids ("Kompetenzraster")**: Pre-built and customizable sets of subject/grade-level competencies (e.g., per state curriculum, per subject, per grade level) that teachers can use as templates or fully customize.
- **Learning progress entries**: Teachers log individual observations/entries per student, linking them to one or more competencies, over time (a running log, not a single snapshot).
- **Performance assessments ("Leistungsfeststellung")**: Structured tests/assignments/checks that are linked to competencies, feeding into the same student timeline.
- **Competence Flower ("Kompetenzblume")**: A radar/spider chart per student showing strength per competency category — "the bigger the petal, the stronger the performance" — used for parent-teacher conferences and progress meetings.
- **One-click reports**: Automatically generated, competency-based report text (not generic phrases) and full report-card documents (PDF) — no copy-pasting or manual formatting.
- **Grade management ("Notenverwaltung")**: Configurable weighting between learning-progress entries and formal assessments to compute a transparent final grade — the teacher decides the weighting formula, not a black box.
- **Role/permission system**: Teachers, school administrators, groups/classes, subject hand-offs when a student changes teacher or school.
- **Multi-school-type support**: Elementary school, middle school (Sekundarstufe I), high school/Gymnasium (Sekundarstufe II) — different competency catalogs and grading rules per school type/grade band.
- **Data portability**: Users can export all their data (competencies, entries, reports) at any time in common formats (CSV/JSON/PDF).
- **Free tier that "just works"**: A permanently free "Basis" plan with core functionality — since our whole project is free, we implement this as simply "the whole app, free, no tiers."

We are explicitly **excluding** from scope (not needed since this is free/single-org, not a multi-tenant SaaS business):
- Billing/subscriptions/Stripe integration.
- Marketing site, SEO landing pages, blog/CMS ("Wissenswertes" articles), press page.
- SSO/enterprise integrations (WebUntis, etc.) — keep as a "future idea," not MVP.

---

## 2. High-Level Goals & Non-Goals

### Goals
- A teacher can register/log in, create classes, add students, and assign a competency grid (template or custom) to a class/subject.
- A teacher can log learning-progress entries and assessments per student, linked to competencies.
- The system auto-calculates a **competency mastery level** per student per competency (based on the entries logged, using a configurable scale).
- The system shows a **radar chart ("Competence Flower")** per student.
- The system can compute a **weighted grade** per subject per student, based on teacher-defined weighting rules.
- The system can generate a **PDF report** per student (competency summary + optional grade) with one click.
- Data model supports **elementary and secondary school** competency structures (configurable grade bands, subjects, and competency hierarchies).
- Everything runs self-hosted with **SQLite** — zero external DB dependency.
- Fully responsive UI, usable on tablets (teachers observed using tablets in classrooms).
- GDPR-friendly by design (data minimization, full export, full delete) even though this isn't a commercial SaaS — schools still handle student data and should be able to trust the tool.

### Non-Goals (v1)
- No payments, no multi-tenant SaaS billing.
- No native mobile apps (a responsive PWA is enough).
- No real-time collaborative editing.
- No AI-generated report text in v1 (flag as a "Phase 2 / stretch goal" — see §11).

---

## 3. Tech Stack (proposed — adjust if you have a strong reason, but justify the change)

- **Frontend**: React (or Next.js in a single full-stack app) + TypeScript. UI library: Tailwind CSS + shadcn/ui for accessible, clean components. Charting: Recharts or Chart.js (radar chart for the "Competence Flower").
- **Backend**: Node.js (within Next.js API routes / App Router server actions) **or** a separate lightweight Express/Fastify API — pick ONE cohesive full-stack framework to keep this simple for a small volunteer team. Next.js (App Router) is recommended so frontend + backend live in one deployable app.
- **Database**: **SQLite**, accessed through **Prisma ORM** (or Drizzle ORM as an alternative — pick one and justify). Reasoning: SQLite keeps hosting trivial (single file, easy backups, works great for a single school's scale of data — thousands of students, not millions), and Prisma/Drizzle gives us migrations, type safety, and an easy upgrade path to Postgres later if a school ever outgrows SQLite (design the schema to be Postgres-compatible too, avoiding SQLite-only quirks).
- **Auth**: Self-hosted email/password auth with hashed passwords (bcrypt/argon2) + session cookies (or a lightweight library like Lucia Auth / Auth.js with a credentials provider). No third-party paid auth services. Support optional TOTP-based 2FA (stretch goal, since Digidoo offers 2FA).
- **PDF generation**: A server-side PDF library (e.g., `@react-pdf/renderer` or Puppeteer-based HTML-to-PDF) for report cards.
- **File storage**: Local filesystem storage for generated PDFs/exports (school-hosted, no S3 dependency required, but abstract storage behind an interface so S3-compatible storage can be swapped in later).
- **Hosting target**: Single Docker container (or docker-compose with a volume for the SQLite file + generated files), deployable on a small VPS. Include a `docker-compose.yml`.
- **i18n**: German and English UI strings from day one (the reference product targets DACH schools), using a simple i18n library (e.g., `next-intl`). Structure all UI text through translation keys — do not hardcode strings.
- **Testing**: Vitest/Jest for unit tests, Playwright for a handful of critical E2E flows (login, create competency grid, log an entry, generate report).

Deliver a `docs/ARCHITECTURE.md` explaining the chosen stack and why, plus a `docs/SELF_HOSTING.md` explaining how a non-technical school IT admin can deploy this with Docker.

---

## 4. Database Design (SQLite via Prisma/Drizzle)

Design a normalized relational schema. Suggested entities (adjust field names to your ORM conventions; this is the conceptual model, not literal DDL):

### Core organizational entities
- **School** — id, name, schoolType (enum: elementary, middle, gymnasium, other), country, timezone, createdAt.
- **User** — id, schoolId (nullable for solo teachers not tied to a school), email, passwordHash, firstName, lastName, role (enum: TEACHER, SCHOOL_ADMIN, SUPER_ADMIN), locale, twoFactorSecret (nullable), createdAt, deletedAt (soft delete).
- **SchoolYear** — id, schoolId, label (e.g. "2026/2027"), startDate, endDate.
- **ClassGroup** ("Klasse/Gruppe") — id, schoolId, schoolYearId, name, gradeLevel (int), schoolType.
- **ClassGroupTeacher** (many-to-many) — classGroupId, userId, role (e.g., HOMEROOM_TEACHER, SUBJECT_TEACHER).
- **Student** — id, schoolId, firstName, lastName, dateOfBirth (nullable, minimize data collected), externalId (nullable, for import matching), createdAt, deletedAt.
- **Enrollment** — id, studentId, classGroupId, schoolYearId, startDate, endDate (nullable = still enrolled). This models students moving between classes/schools over time.

### Subject & competency structure
- **Subject** — id, schoolId (nullable = global/template), name, gradeLevelMin, gradeLevelMax.
- **CompetencyTemplate** — id, name, description, subjectId (nullable if cross-subject), schoolType, gradeLevelMin, gradeLevelMax, isGlobalTemplate (bool), createdByUserId (nullable for system-provided templates), version.
- **CompetencyCategory** — id, competencyTemplateId, name, order (for grouping competencies into "petals" of the flower — e.g., "Reading," "Writing," "Listening" within Language Arts).
- **Competency** — id, categoryId, code (short reference like "D.3.LES.01"), title, description, order, masteryLevels (JSON or related table — see below).
- **MasteryLevelDefinition** — id, competencyId (or categoryId, if scale is shared), levelValue (e.g., 1–4), label (e.g., "not yet demonstrated," "developing," "proficient," "advanced"), description.
- **ClassCompetencyAssignment** — links a ClassGroup + Subject to a chosen CompetencyTemplate for a given SchoolYear, plus any per-school customizations (could be a cloned/forked copy of the template rather than a live reference, so a school's edits don't affect the global template — design a "clone on customize" strategy).

### Progress tracking & assessment
- **LearningProgressEntry** — id, studentId, competencyId, teacherId, classGroupId, date, masteryLevelValue, note (free text, optional), createdAt. This is the append-only observation log.
- **Assessment** ("Leistungsfeststellung") — id, classGroupId, subjectId, teacherId, title, date, type (enum: TEST, ORAL, PROJECT, HOMEWORK, OTHER), maxScore (nullable), weight (default weight for grading).
- **AssessmentCompetencyLink** (many-to-many) — assessmentId, competencyId, weight (how much this assessment contributes to that competency's mastery).
- **AssessmentResult** — id, assessmentId, studentId, score (nullable), masteryLevelValue (nullable), note.

### Grading
- **GradingScheme** — id, classGroupId or subjectId, name, type (enum: NUMERIC_GRADE, VERBAL_FEEDBACK, COMBINED), scaleDefinition (JSON — e.g., grade 1–6, or 1–15 points, configurable per country/state).
- **GradingWeightRule** — id, gradingSchemeId, sourceType (enum: LEARNING_PROGRESS, ASSESSMENT), targetRef (competencyId or assessmentId or categoryId), weightPercent. Defines "how much of the final grade comes from what."
- **ComputedGrade** — id, studentId, subjectId, classGroupId, schoolYearId, period (e.g., "Semester 1"), computedValue, computedAt, isFinalized (bool), overriddenValue (nullable, teacher can manually override with a reason), overrideReason.

### Reporting
- **Report** — id, studentId, classGroupId, schoolYearId, period, generatedByUserId, generatedAt, status (enum: DRAFT, FINAL), pdfFilePath, includesGrades (bool).
- **ReportSection** — id, reportId, competencyCategoryId (nullable), generatedText, order — stores the generated narrative per section so reports remain auditable/editable before finalizing.

### Auditing & compliance
- **AuditLog** — id, userId, action, entityType, entityId, timestamp, metadata (JSON) — for accountability (who edited a grade, who exported data).
- **DataExportRequest** — id, requestedByUserId, scope (student/class/school), status, filePath, requestedAt, completedAt — supports the "you can always export your data" principle.

**Design requirements:**
- Use UUIDs (or ULIDs) as primary keys for portability, not SQLite autoincrement-only ints, to make future multi-instance sync/export easier.
- All timestamps in UTC.
- Soft deletes on Student/User (never hard-delete a student's historical record silently — provide an explicit "permanently erase" GDPR-style flow instead that cascades properly and logs an AuditLog entry).
- Write Prisma/Drizzle schema files, plus at least one seed script (`prisma/seed.ts`) that creates: a demo school, a demo teacher login, 2 demo classes, ~15 demo students, a sample competency template (Math + German, elementary level, 2 categories, ~6 competencies each with a 4-point mastery scale), a handful of learning-progress entries and one assessment, so the app is explorable immediately after `docker-compose up`.
- Provide migration scripts and document the "SQLite → Postgres" upgrade path in `docs/ARCHITECTURE.md` (which ORM features to avoid to keep this portable — e.g., avoid raw SQLite-only pragmas in app logic, avoid case-sensitive collation assumptions, use ORM-level constraints not SQLite triggers).
- Enable SQLite WAL mode and document backup strategy (just copy the `.sqlite` file + files directory; note SQLite's concurrent-write limitations and why that's fine at single-school scale, with guidance on when a school should be advised to migrate to Postgres).

---

## 5. Core User Roles & Permissions

- **Teacher**: Manage their own classes, students in their classes, log entries/assessments, view competence flowers, generate reports, customize competency grids for their classes.
- **School Admin**: Everything a teacher can do, plus manage the school's user list, manage school-wide competency templates, manage school years/classes, view audit logs, run data exports/erasure.
- **Super Admin** (project maintainer / self-hoster's own account): Manage global competency template library (the "starter" templates shipped with the app, akin to Digidoo's pre-built state curricula), manage schools if the instance hosts more than one school, system settings.

Implement middleware-level authorization checks (not just UI hiding) on every API route — a Teacher must never be able to query another school's data even by guessing IDs. Write tests specifically for this (IDOR-style access control tests).

---

## 6. Key Feature Specs (User Stories + Acceptance Criteria)

### 6.1 Onboarding & Auth
- As a new user, I can register with email/password, verify my email (or skip verification in self-hosted mode via config flag), and log in.
- As a user, I can reset my password via email link.
- As a user, I can optionally enable TOTP 2FA.
- Acceptance: passwords hashed with argon2id, rate-limited login attempts, session expiry configurable, CSRF protection on all mutating routes.

### 6.2 School / Class / Student setup
- As a teacher, I can create a class group, set its grade level and school type, and add students (manually one-by-one, or via CSV import with column mapping).
- As a teacher, I can assign one or more subjects to a class.
- Acceptance: CSV import validates rows, shows a preview + error list before committing, supports re-running with corrections.

### 6.3 Competency grid management
- As a teacher/admin, I can browse a library of starter competency templates (seeded ones + any the school has created), filtered by school type, grade level, and subject.
- As a teacher, I can assign a template to a class+subject for the school year, which creates an editable **school-owned copy** (so edits don't mutate the shared template).
- As a teacher/admin, I can edit competency categories/items/mastery-level definitions on my school's copy, or build a fully custom grid from scratch.
- Acceptance: template cloning is atomic (categories + competencies + mastery levels all copied together); editing a school copy never changes the original global template.

### 6.4 Logging learning progress
- As a teacher, from a class roster view, I can quickly log an entry for a student: pick competency (or multiple), pick mastery level, add optional note, save — optimized for fast repeated entry during/after class (keyboard-friendly, minimal clicks, works well on tablet).
- As a teacher, I can see a student's full timeline of entries.
- Acceptance: entry creation is <3 interactions from the roster view for the common case; entries are immutable-by-default but editable by the original author within a configurable time window, with all edits captured in AuditLog.

### 6.5 Assessments
- As a teacher, I can create an assessment (test/oral/project/etc.), link it to one or more competencies with weights, and record per-student results (score and/or mastery level).
- Acceptance: bulk entry UI (spreadsheet-like grid: students × one assessment) for fast grading of a whole class at once.

### 6.6 Competence Flower (radar chart)
- As a teacher/parent-in-meeting, I can view a per-student radar chart where each axis is a competency category and the value is the computed current mastery level (most recent entries weighted, or average — make the aggregation method configurable per template: "latest value," "average of last N," "weighted by recency").
- Acceptance: chart updates live as new entries are logged; hovering/tapping a petal shows the underlying entries; exportable as an image (PNG/SVG) for use in printed materials or slides.

### 6.7 Grade computation
- As a teacher, I can define a grading scheme per subject/class (numeric grade scale, or verbal feedback, or combined) and a weighting rule set (e.g., "60% assessments, 40% learning-progress mastery average").
- As a teacher, I can view the computed grade per student with a transparent breakdown ("this grade = X% from Assessment A, Y% from competency category B, ...").
- As a teacher, I can manually override a computed grade with a required justification note (stored in AuditLog + ComputedGrade.overrideReason).
- Acceptance: computation logic is a pure, well-tested function (given inputs, deterministic output) — cover with unit tests including edge cases (missing data points, all-verbal no numeric grade, partial-year enrollment).

### 6.8 Reports
- As a teacher, I can generate a report for a student (or a whole class in bulk) for a given period, combining: a competency summary (with the flower chart embedded), narrative text generated from templated phrases per mastery level per competency (NOT AI-generated in v1 — use a configurable phrase-template system: e.g., "shows [level.label] performance in [competency.title]"), and optionally the computed grade.
- As a teacher, I can review/edit the generated draft text before finalizing (report status DRAFT → FINAL; FINAL reports are locked and versioned).
- As a teacher, I can export a report as PDF and download it, or bulk-export a whole class as a ZIP of PDFs.
- Acceptance: PDF is well-formatted (printable A4, school-branding-agnostic — configurable logo/header per school), generation completes in a reasonable time even for a class of 30, and the phrase-template system is data-driven (stored in DB / config, not hardcoded strings) so schools can localize/adjust wording.

### 6.9 Data portability & privacy
- As a school admin, I can export all of a class's or school's data as structured JSON/CSV at any time.
- As a school admin, I can permanently erase a student's data (with confirmation + audit trail) when required (e.g., student leaves the school and retention period expires).
- Acceptance: exports include everything needed to reconstruct history in another system; erasure cascades correctly across all tables including generated PDFs on disk.

### 6.10 Dashboard
- As a teacher, my home dashboard shows: my classes, recent activity (entries logged this week), students who haven't had an entry logged in X days (flag for follow-up), upcoming report deadlines (configurable per school year).

---

## 7. UI/UX Requirements

- Original visual design — do not reuse Digidoo's illustrations, exact color palette, or copy. Build a clean, warm, education-appropriate design system (define a small design token set: colors, spacing, typography) — consider Tailwind + shadcn/ui defaults customized with an accent color distinct from Digidoo's.
- Mobile/tablet-first for the "log an entry" flow specifically (teachers use this standing in a classroom); desktop-first is fine for admin/setup screens and reports.
- Full keyboard navigation and screen-reader labels (WCAG 2.1 AA target) — schools may have accessibility obligations.
- Support German and English from day one via the i18n system (§3); default to German since the target audience is DACH schools, but make English complete too since this is described as an open-source/free project others may adopt.
- Empty states and onboarding checklists for a brand-new school ("1. Create your first class → 2. Assign a competency grid → 3. Add students → 4. Log your first entry").

---

## 8. Non-Functional Requirements

- **Self-hostability**: one `docker-compose.yml`, one `.env.example`, a `README.md` with copy-pasteable setup instructions targeting a non-expert school IT person. Target: from `git clone` to running app in under 10 commands.
- **Performance**: fast on modest hardware — SQLite + server-rendered pages where sensible (Next.js SSR/RSC) to keep client bundle small; paginate long lists (student rosters, entry timelines).
- **Backups**: document and script a simple daily backup (cron job copying the SQLite file + generated files directory to a backup location); consider using `litestream` or SQLite's `.backup` command and mention it as a recommended addition.
- **Security**: input validation on every API boundary (e.g., Zod schemas), parameterized queries only (ORM prevents SQL injection by default — don't bypass with raw string interpolation), secure cookie flags, rate limiting on auth endpoints, dependency vulnerability scanning in CI.
- **Licensing**: since this is a free/donation project, ship it under an OSI-approved open-source license (recommend MIT or AGPLv3 — explain the trade-off: AGPL prevents someone from taking this code and reselling it as a closed SaaS without contributing back, which may suit a "for the school, not for profit" mission better than MIT; let the team choose).
- **CI/CD**: GitHub Actions workflow running lint, typecheck, unit tests, and E2E smoke tests on every PR.

---

## 9. Project Structure (suggested)

```
/app                # Next.js App Router pages (or /src/app)
  /(auth)
  /(dashboard)
  /api
/components
/lib
  /db                # Prisma/Drizzle client, schema
  /grading           # pure grading calculation functions + tests
  /reports           # report generation + PDF rendering
  /permissions        # authorization helpers
/prisma (or /drizzle)
  schema.prisma
  seed.ts
  migrations/
/docs
  ARCHITECTURE.md
  SELF_HOSTING.md
  DATA_MODEL.md        # ER diagram + entity descriptions
  CONTRIBUTING.md
/tests
  unit/
  e2e/
docker-compose.yml
.env.example
README.md
LICENSE
```

---

## 10. Deliverables & Definition of Done for v1 (MVP)

1. Auth (register/login/reset, optional 2FA) working end-to-end.
2. School → SchoolYear → ClassGroup → Student → Enrollment CRUD, with CSV import for students.
3. At least 2 seeded starter competency templates (e.g., "Elementary Math – Grade 3" and "Elementary German – Grade 3") with categories, competencies, and a 4-level mastery scale.
4. Teachers can assign/clone a template to a class+subject, edit their school's copy.
5. Fast entry-logging UI from a class roster.
6. Assessments with bulk grid entry.
7. Competence Flower radar chart per student, computed from real entry data, with a configurable aggregation method.
8. Grading scheme + weight rules + computed grade with breakdown + manual override.
9. Report generation (draft → final → PDF) with templated narrative text, single and bulk (class) export.
10. Data export (JSON/CSV) and erasure flow, with audit logging.
11. i18n scaffolding with DE + EN complete for all implemented screens.
12. Dockerized self-hosting setup + docs, seed script for demo data.
13. Test suite: unit tests for grading logic and permissions (target meaningful coverage on these two modules specifically, not just an overall % target), Playwright E2E covering: register → create class → assign template → add students → log entries → generate report.
14. `README.md` explaining the project's mission (free tool built for/with a school, donation-supported) and how to contribute.

---

## 11. Phase 2 / Stretch Goals (explicitly out of scope for v1, but document as future ideas in `docs/ROADMAP.md`)

- AI-assisted (optional, user-triggered) drafting of report narrative text, clearly marked as a draft for teacher review — never auto-finalized.
- SSO (OIDC) support for schools with existing identity providers.
- Parent portal (read-only view of their child's competence flower and finalized reports).
- Kita/early-childhood observation module (as Digidoo has hinted at on their roadmap).
- Optional Postgres deployment mode for larger multi-school instances.
- Native offline-first PWA mode for spotty classroom Wi-Fi.

---

## 12. Instructions for the AI Coding Agent

When you start implementing:
1. First produce `docs/ARCHITECTURE.md` and the full Prisma/Drizzle schema (§4) and get my confirmation before writing app code.
2. Then scaffold the Next.js project, auth, and the seed script — get the demo environment runnable first.
3. Build features in this order: School/Class/Student setup → Competency templates → Entry logging → Assessments → Competence Flower → Grading → Reports → Data export/erasure.
4. After each feature, write its unit/E2E tests before moving to the next.
5. Keep commits small and descriptive; write a CHANGELOG.
6. Flag any point where you are uncertain about a competency/grading policy that varies by German state (Bundesland) — expose it as a configuration option rather than hardcoding one state's rules, and note the assumption in `docs/DATA_MODEL.md`.
7. Remember throughout: **this is a free, non-commercial, donation-supported school project.** Prefer boring, dependency-light, self-hostable solutions over anything that introduces a paid third-party service or vendor lock-in.


# PRD v2 — "SchoolOS" (formerly "CompetenceTrack")
### A Free, Self-Hosted, All-in-One School Platform (Digidoo-inspired competency core + full school operations)

---

## 0. Mission & Non-Negotiable Principles

This is a **free, donation-supported school project**, not a commercial SaaS. It is being built for a real school; any support it receives goes back to the school. These principles override every design decision below:

1. **DB: SQLite.** Single-file, self-hostable, cheap to run and back up. (One exception, scoped narrowly: an embedded vector store for AI search — see §9.6 — which can also run fully local/in-process.)
2. **No hardcoding, anywhere.** Every list, label, rule, threshold, escalation window, warning count, template, and permission must come from the database or an admin-editable config table — never a constant baked into code. If a value could plausibly differ between two schools or change next semester, it is a DB row, not a literal.
3. **No mock data, ever** — not in dev, not in demo, not in tests-as-shipped-UI. Seed scripts may create *realistic sample rows* for local development (clearly documented as seed data, easily wiped), but the shipped application must never silently render placeholder/fake data as if real.
4. **No duplicate functionality across pages.** Every capability lives in exactly one canonical place. Example: anything date/deadline/appointment-related belongs only on the **Calendar** page — not also embedded as a mini-widget with its own logic elsewhere unless it's a true *read-only summary widget pulling from the same single source* (see §8, Dashboard Widgets — a widget is a view, never a second implementation). Before adding any feature, check whether an existing page/module already owns that responsibility; if so, extend it there or surface it as a widget, don't rebuild it.
5. **Tablet-first, touch-first**, with full parity and a well-adapted layout for desktop/PC. This is the primary device class for teachers and students in-classroom.
6. **Everything is dynamic and role/permission-aware**, driven by real DB relationships (school → year → class → subject → student → user), never assumed.
7. Open-source license recommended: **AGPLv3** (prevents a third party from taking this free/community project and reselling it closed-source without contributing back) — team to confirm.

---

## 1. Module Map

The platform is organized into cohesive modules, each owning its data and UI completely (principle #4 above). This PRD defines each module's scope precisely so responsibilities never blur.

| # | Module | Owns |
|---|--------|------|
| A | **Academics Core** | Competency grids, learning-progress entries, assessments, competence flower, grading, report cards *(carried over from PRD v1 — see §2, condensed)* |
| B | **Signage** | TV/billboard displays: announcement slides, sponsor slides, emergency/fire/counseling alerts |
| C | **Communication** | Direct messaging, escalation rules, class/grade social rooms, class-hours messaging locks |
| D | **Learning Hub** | Videos, interactive exercises, worksheets, vocab trainer, learning game, AI-assisted content authoring |
| E | **AI Tutor** | In-context homework help, hint-only policy, full lockout during tests, content translation for foreign students |
| F | **Exam Mode** | Kiosk/lockdown test-taking, teacher live controls, student warning system, incident log |
| G | **Digital Notebook** | Typed + stylus/pen notebook per student per subject, teacher pen annotation on tests/homework |
| H | **Notifications** | All push/in-app notifications, the *only* place alerts render outside their originating context banner |
| I | **Calendar** | All dates/deadlines/appointments/exam schedules/report deadlines — the *only* source of truth for "when" |
| J | **Dashboard & Widgets** | Per-user customizable home screen assembled from read-only widgets pulling from A–I |
| K | **Identity & Admin** | Users, roles, schools, classes, disciplinary records, audit log, permission/rule configuration |

Every module below lists: purpose, roles involved, key entities, core flows, and explicit rules given by the school.

---

## 2. Module A — Academics Core (condensed; full detail in PRD v1)

Unchanged from the original spec: **CompetencyTemplate → CompetencyCategory → Competency → MasteryLevelDefinition**, **LearningProgressEntry**, **Assessment/AssessmentResult**, **GradingScheme/GradingWeightRule/ComputedGrade**, **Report/ReportSection**. See PRD v1 §4 and §6.1–6.7 for the full entity list and user stories — carry those forward unchanged. New in v2:

- Assessment results integrate with **Exam Mode** (Module F): an Assessment can be flagged `deliveryMode = DIGITAL_LOCKED`, which triggers the kiosk/lockdown flow when a student starts it.
- Reports can optionally embed the student's **Digital Notebook** entries for the period as an appendix (teacher-selectable, off by default for privacy/size).

---

## 3. Module B — Digital Signage (TV / Billboards)

**Purpose:** Replace physical bulletin boards with school-controlled TV displays for announcements, class/period info, sponsor content, and — critically — emergency alerts.

**Roles:** School Admin/Management authors & publishes; Sponsor content is admin-approved only (no self-serve); Teachers can request a slide be added (goes to an admin approval queue, not published directly) unless the school configures otherwise (config-driven per §0.2).

**Entities:**
- `SignageDisplay` — id, schoolId, location/name (e.g., "Main Hall Screen 1"), resolution profile, isActive.
- `SignageSlide` — id, schoolId, type (enum: ANNOUNCEMENT, SPONSOR, INFO, SCHEDULE), title, body/media, priority, startAt, endAt, createdByUserId, approvalStatus.
- `SignagePlaylist` — id, displayId (or "all displays"), ordered list of slides, rotation duration per slide.
- `EmergencyAlert` — id, schoolId, type (enum: FIRE, LOCKDOWN, MEDICAL, GENERAL_EMERGENCY, COUNSELING_NOTICE), message, triggeredByUserId, triggeredAt, resolvedAt, affectedScope (whole school / specific building / specific class).

**Core flows:**
- Normal rotation: displays cycle through active, date-windowed slides per their playlist, weighted by priority.
- **Emergency override (highest priority, non-negotiable):** any `EmergencyAlert` created by an authorized user (Admin, or any Teacher for fire/medical — configurable per school policy) **immediately interrupts every display's rotation**, shows a full-screen alert with type-specific styling (e.g., red/fire iconography for FIRE), and simultaneously fires a push notification (Module H) to all staff devices, and, for FIRE/LOCKDOWN, to all logged-in student/parent devices per school policy. Alert clears only when explicitly resolved by an authorized user, logged in AuditLog.
- **Counseling notice**: a lower-urgency variant — visible only on staff-facing displays/dashboards, not broadcast school-wide, used e.g. to flag "counselor needed in room X" without alarming the whole building.
- Sponsor slides: admin uploads, sets a date window and rotation weight; never auto-published from a teacher request.

**Rule from the school:** any teacher-submitted slide must pass admin approval before appearing — build this as a queue with approve/reject + optional edit, not a silent auto-publish, unless the admin later flips a config flag to allow trusted teachers to self-publish INFO-type slides for their own class.

---

## 4. Module C — Communication (Messaging & Escalation)

This is the most rule-heavy module. Implement the escalation logic as **data-driven policy rows**, not hardcoded if/else chains, so admin can adjust thresholds without a code change.

**Entities:**
- `MessageThread` — id, schoolId, type (enum: DIRECT, CLASS_ANNOUNCEMENT, SOCIAL_ROOM), participantsOrScope.
- `Message` — id, threadId, senderId, body, sentAt, readReceipts.
- `EscalationPolicy` — id, schoolId, fromRole, toRole, requiredPriorContactRole, waitingPeriodBusinessDays (default 3), isActive, overriddenByUserId (nullable, for admin-configured exceptions). **All numbers here (the "3 business days") are read from this table, never hardcoded.**
- `EscalationRequest` — id, studentId or parentId (requester), subject, firstContactThreadId, firstContactAt, eligibleToEscalateAt (computed = firstContactAt + policy.waitingPeriodBusinessDays business days, using the school calendar to skip holidays), status (enum: WAITING, ELIGIBLE, ESCALATED, RESOLVED).
- `SocialRoom` — id, schoolId, scope (enum: CLASS, GRADE_LEVEL/"Stufe", CUSTOM_GROUP), name, moderatorUserIds, isActive.
- `ClassMessagingLock` — id, classGroupId, lockedByUserId (the teacher), lockedFrom, lockedUntil (nullable = "until class ends," or explicit time) — while active, students in that class cannot send/receive in student-facing threads (staff-to-student announcements still deliver).
- `DisciplinaryRecord` — id, userId (student or, separately, staff-disciplinary variant), type, description, issuedByUserId, linkedIncident (nullable FK to an ExamWarning or a reported message), visibleToParent (bool), createdAt.

**Core rules (exactly as specified by the school, encoded as the default `EscalationPolicy` rows — admin can edit or disable):**
- **Parent → Admin:** allowed only for genuinely necessary matters, and only after the parent has messaged the student's **homeroom teacher** about that subject at least once. If no reply within **3 business days**, the parent gains the right to message Admin about that specific thread (system auto-creates/unlocks the Admin channel on that `EscalationRequest`, referencing the original thread for context).
- **Student → Admin/Counseling:** same pattern — student must first message the homeroom teacher; after 3 business days without reply, gains the right to escalate to the counseling unit ("Rehberlik" — modeled as a `Counselor` role/department) and/or Admin.
- **Teacher → Admin:** direct, no escalation gate required.
- **Admin/Management override:** Admin can loosen, tighten, or remove any `EscalationPolicy` row per school, per role pair, or per individual case (`overriddenByUserId` + reason, logged). Admin can also issue a `DisciplinaryRecord` against a teacher or student directly from a messaging or exam-incident context.
- **Social rooms:** class-scoped or grade/"Stufe"-scoped group discussion spaces ("mini Facebook"), moderated by assigned staff; posts/threads, not just DMs. Config per school: which scopes are enabled, whether posts need moderation approval before visible.
- **Class-hours lock:** a teacher can toggle `ClassMessagingLock` for their class; while active, students in that class are blocked from sending in student↔student and student↔staff threads (but can still *receive* urgent Signage/Notification-level alerts) until the teacher lifts it or class period ends (integrate with Module I's period/timetable data to auto-lift at period end if the teacher doesn't manually lift it — config toggle for auto vs. manual).

**Business-day computation** must read the school's holiday/weekend calendar from Module I (Calendar), not assume a fixed Mon–Fri with no holidays.

---

## 5. Module D — Learning Hub (Student Self-Study Resources)

**Purpose:** A curriculum-aligned self-study resource center (functionally inspired by tools like Sofatutor — do not copy their branding, exact video content, or exact wording; build original or licensed/open content, organized the same *way*: by subject and grade level).

**Entities:**
- `LearningResource` — id, schoolId (nullable = shared/global library), subjectId, gradeLevel, type (enum: VIDEO, INTERACTIVE_EXERCISE, WORKSHEET, VOCAB_SET, GAME_MODULE), title, description, contentRef (file path or embed URL), competencyLinks (many-to-many to `Competency`, so resources surface contextually — e.g., from a student's weak competency-flower petal, "here's a resource to help"), createdByUserId (teacher/admin/AI-assisted), reviewStatus (enum: DRAFT, PENDING_REVIEW, PUBLISHED), aiGenerated (bool).
- `WorksheetSolution` — attached to a WORKSHEET resource, hidden by default, revealable by student after attempt or by teacher setting.
- `VocabSet` / `VocabItem` — user-entered or teacher-provided vocab lists feeding the vocab trainer's spaced-repetition practice loop.
- `GameProgress` — per-student progress/score state for the learning game module, scoped by subject.

**Core flows:**
- Teachers/Admin can create, edit, or request AI-assisted drafting of a resource (AI drafts → always lands in `PENDING_REVIEW`, never auto-published — a human must approve, consistent with §0.2's "no silent hardcoded/auto content" spirit and basic content-quality control).
- Resources are discoverable by subject/grade browse, search, **and contextually** — surfaced automatically next to a student's weak competency in Module A's Competence Flower and in AI Tutor suggestions (Module E).
- Printable worksheets export as PDF with an optional teacher toggle to include/exclude the solutions page.

---

## 6. Module E — AI Tutor & AI Content Assistance

**Purpose & hard policy (as specified by the school — implement as enforced server-side logic, not just prompt instructions, since this is a safety/integrity requirement, not a suggestion):**

- The AI tutor **may**: explain a concept, walk through a *similar* worked example, give a hint on where a student is stuck, define a term, and — for a specific single question a student is stuck on — nudge them toward the next step.
- The AI tutor **must never**: produce a direct final answer to an assigned homework/assessment question, complete an assignment on the student's behalf, or operate at all while any `Assessment` with `deliveryMode = DIGITAL_LOCKED` is active for that student (hard gate — see Module F; the AI chat endpoint checks "is this student currently inside an active exam session?" and refuses if so, independent of any client-side UI state).
- Every AI Tutor interaction is logged (`AiTutorInteraction`: id, studentId, subjectId/competencyId if applicable, promptSummary, responseSummary, timestamp, flaggedAsHomeworkAttempt bool) so teachers/admin can audit for misuse patterns, without necessarily storing full raw chat transcripts if the school prefers privacy-minimized logging (config toggle: summary-only vs full-transcript retention, with a retention period).
- **Translation:** AI-powered on-demand translation of learning content and (optionally) UI copy for foreign-language students, requested per-resource or per-message, with the translated text clearly labeled "AI-translated" and a way to flag a bad translation for staff review.

**Content-authoring assist (Module D bridge):** the same AI capability can be invoked by teachers/admin to draft Learning Hub resources or Signage announcement copy — always landing in a review/draft state, never publishing directly.

---

## 7. Module F — Exam Mode (Digital Lockdown & Proctoring)

**Purpose:** A secure, kiosk-style test-taking mode for digitally delivered assessments, plus the in-test behavior/warning system the school specified.

**Entities:**
- `ExamSession` — id, assessmentId, studentId, deviceId, startedAt, status (enum: ACTIVE, PAUSED, RESUMED, ENDED, CANCELLED), pausedByUserId (nullable), pauseReason (enum: BATHROOM_REQUEST, TEACHER_INITIATED, STUDENT_DISTRESS, THIRD_WARNING, OTHER).
- `ExamWarning` — id, examSessionId, issuedByUserId (teacher), reason (free text or preset e.g. "talking," "looking at other screen"), sequenceNumber (1st/2nd/3rd), issuedAt.
- `ExamIncidentEvent` — id, examSessionId, type (enum: LOCK_BREACH_ATTEMPT, BATHROOM_REQUESTED, BATHROOM_GRANTED, DISTRESS_SIGNAL, PAUSED, RESUMED, CANCELLED), metadata, timestamp.

**Core flow (exactly as specified):**
1. When a student opens a `DIGITAL_LOCKED` assessment, the client enters **kiosk/fullscreen lockdown**: the device locks to the exam UI only — no other tabs/apps, no AI Tutor access (hard-gated per Module E), timer visible per assessment config.
2. **Bathroom request:** student taps a "request break" control → teacher gets a real-time alert (Module H) → if the teacher approves, that student's individual `ExamSession` pauses (other students' sessions are unaffected) → resumes when the teacher (or the student, per config) marks return.
3. **Distress signal:** student can send an "I feel unwell / need help" signal at any time → immediate high-priority alert to the teacher (distinct styling/sound from a routine bathroom request) → teacher attends; if unresolved, teacher can pause or fully cancel that student's exam (cancellation reason required, logged, visible to parent/admin).
4. **Behavior warnings:** teacher can issue an `ExamWarning` to a specific student mid-test (e.g., for talking or looking at another student's screen). 1st and 2nd warnings are logged and shown to the student as an alert; the 2nd is explicitly flagged as "final warning." On the 3rd, the system **auto-pauses** that student's exam; the teacher then decides to resume or end it. Every warning and the resulting record is stored on the student's disciplinary/record trail, visible to parents and admin (reuses `DisciplinaryRecord` from Module C, linked via `linkedIncident`).
5. Teacher has a live **class exam-monitor view**: every student's session status (active/paused/warned) at a glance, one-tap pause/resume/cancel/warn per student.
6. All lockdown enforcement must be **defense-in-depth**: client-side kiosk/fullscreen API + Workbox-based service worker to intercept navigation attempts, *and* a server-side session flag that independently blocks other API calls (AI Tutor, Learning Hub, Messaging) for the duration — never trust the client alone for an integrity feature.

---

## 8. Module G — Digital Notebook

**Purpose:** Digital replacement for the paper exercise notebook — environmental motivation stated explicitly — while supporting Germany's range of school notebook/exercise-book conventions.

**Entities:**
- `NotebookTemplate` — id, schoolId (nullable = global), name, ruling type (e.g., lined, squared/Kariert, blank), gradeLevel/subject applicability — mirrors the real German notebook types (Lineatur) so pages "feel" like the paper equivalent students already know.
- `NotebookPage` — id, studentId, subjectId, classGroupId, templateId, createdAt, content (structured: typed text blocks + vector "ink" strokes for stylus input, stored e.g. as SVG/stroke-JSON, not baked raster images, so it stays editable/searchable/annotatable).
- `NotebookAnnotation` — id, pageId (or linked to an Assessment submission), authorUserId (teacher), strokeData/comment, createdAt — used for teacher correction marks/pen feedback directly on a test or notebook page.

**Core flows:**
- Students write via keyboard and/or stylus (pen) — both can coexist on the same page (e.g., typed answer + hand-drawn diagram).
- Teachers annotate directly on a digital test submission or notebook page with pen input — highlighting, circling, margin comments — captured as its own `NotebookAnnotation` layer so the original student work is never overwritten (non-destructive review, mirroring how a teacher marks a real paper test in red pen).
- Notebook pages are organized per subject per student per school year, browsable like a real notebook (page-by-page / date-by-date), exportable as PDF.

---

## 9. Cross-Cutting Modules

### 9.1 Module H — Notifications (single source of alerts)
All push/in-app alerts — messaging, exam warnings/bathroom requests, signage emergencies, escalation-eligibility notices, learning-hub review-queue items — route through **one** `Notification` entity and **one** delivery pipeline (browser push via the Web Push API, service-worker-delivered per **Workbox**, plus an in-app notification center). No module renders its own separate "toast/badge" system outside this pipeline — per the no-duplication rule (§0.4), every other module *emits* into Module H rather than building its own alert UI.

`Notification` — id, recipientUserId, type, priority (enum: NORMAL, URGENT, EMERGENCY), title, body, deepLinkRef (points back to the owning module/entity), createdAt, readAt, deliveredChannels (JSON: push/in-app/etc).

### 9.2 Module I — Calendar (single source of "when")
All dates live here: class timetable/periods, exam schedules, report-card deadlines, school holiday calendar (feeds Module C's business-day math), signage slide date windows (referenced, not duplicated — Calendar shows a read-only reflection sourced from `SignageSlide.startAt/endAt`, it doesn't own a second date field). Same non-duplication logic applies to every other module with a date.

### 9.3 Module J — Dashboard & Widgets
Every user role gets a **customizable home dashboard**: add/remove/reorder widgets from an approved catalog (each widget is a thin, read-only view into one owning module — e.g., "Today's Notifications," "My Classes' Exam Sessions Live," "Upcoming Calendar Items," "Class Competence Flower Summary," "Learning Hub: resources pending review"). Widget layout persists per user (`UserDashboardLayout` — userId, widgetInstances JSON: widgetType, position, size, config). Widgets never contain their own business logic beyond fetching/rendering — this enforces §0.4 structurally, not just by convention.

### 9.4 Module K — Identity, Roles & Admin
Extends PRD v1's role model (Teacher / School Admin / Super Admin) with:
- **Counselor** ("Rehberlik") role — receives escalated student/parent threads per Module C.
- **Parent** role — read-only into their child's reports/grades/competence flower (from Module A), messaging per Module C's rules, visibility into `DisciplinaryRecord` entries flagged `visibleToParent`.
- **Student** role — Learning Hub, AI Tutor (gated), Exam Mode, Digital Notebook, Communication (gated by escalation rules and class locks).
- **Sponsor** is not a login role — sponsor content is admin-managed only (per Module B).
- All escalation thresholds, warning limits, kiosk enforcement toggles, and messaging rules are exposed in a single **Admin Policy Console** so a non-technical admin can tune the whole rules engine without touching code — this is the concrete implementation of "admin can loosen/tighten/remove these rules."

### 9.5 Touch/Tablet UI-UX Overhaul
- Minimum touch target 44×44pt (WCAG/Apple HIG baseline), larger on primary actions (exam controls, entry-logging buttons).
- Enlarged cards/list rows in tablet breakpoint, denser layout on desktop breakpoint — one responsive design system, not two separate codebases.
- **Kiosk/fullscreen mode**: implement via the Fullscreen API + a Workbox-powered service worker (offline shell caching, reliable "install as app" PWA behavior, and push notification delivery even when the browser tab isn't focused).
- Free browser push notifications: Web Push API, no paid push-notification vendor required.

### 9.6 AI/Search Infrastructure Note (re: suggested repos)
- **Workbox** (GoogleChrome/workbox): use for the PWA service worker — offline shell caching, kiosk-mode reliability, and Web Push delivery (Module H, §9.5). This is the clearest direct fit.
- **Comlink** (GoogleChromeLabs/comlink): use to offload heavy client-side work (e.g., stylus stroke rendering/processing in the Digital Notebook, or client-side AI-translation pre/post-processing) to a Web Worker via a simple RPC-style API, keeping the main thread responsive for touch input — directly supports the "touch performance" requirement.
- **Chroma** (chroma-core/chroma): an embeddable vector database, usable to power semantic search over Learning Hub resources and as retrieval-augmented context for the AI Tutor (so it answers "using this school's actual curriculum materials" rather than generic knowledge). Can run embedded/local — keep it as an optional, swappable component behind an interface, not a hard dependency, so a school without AI features enabled never needs to run it. **Primary relational data stays in SQLite regardless** (§0.1) — Chroma, if used, only stores content embeddings for search/retrieval, not core school records.

---

## 10. Updated Non-Functional Requirements

- Reconfirm §0's five principles apply to **every module above**, not just Module A.
- Security posture from PRD v1 (§8) still applies, plus: Exam Mode integrity must be defense-in-depth (§7.6); Emergency Alerts (§3) must have the lowest possible latency path — treat as a "fire drill"-grade reliability requirement, test failure/retry behavior explicitly.
- Data minimization: AI Tutor logging defaults to summary-only (§6); Digital Notebook stroke data belongs to the student and must be exportable/erasable like any other student record (PRD v1 §6.9).
- Accessibility (WCAG 2.1 AA) applies across all new modules, including Signage (captioned/legible from a distance) and Exam Mode (must remain usable with assistive tech even inside lockdown).

---

## 11. Revised MVP Phasing

Given the expanded scope, ship in **stages** rather than one giant release — each stage fully functional and demo-able:

**Stage 1 — Foundation (carries PRD v1 MVP):** Identity/roles/schools/classes/students, Module A (Academics Core) end-to-end, Calendar (Module I) as the shared date backbone, Notifications (Module H) skeleton, Dashboard/Widgets (Module J) with 2–3 widgets.

**Stage 2 — Communication & Signage:** Module C in full (messaging, escalation policy engine, social rooms, class lock), Module B (signage, including Emergency Alert override), wired into Module H/I.

**Stage 3 — Learning & AI:** Module D (Learning Hub, manual authoring first, AI-assist as a fast-follow), Module E (AI Tutor with hard test-time gating from day one — never ship AI Tutor before Exam Mode's gate exists, to avoid ever shipping a homework-solving loophole).

**Stage 4 — Exam Mode & Digital Notebook:** Module F (kiosk lockdown, warnings, monitor view) and Module G (typed + stylus notebook, teacher annotation) — these are the highest-integrity/most device-sensitive modules, saved for last so the touch/kiosk foundation (§9.5) is mature first.

Each stage gets its own seed data, its own test suite additions, and its own entry in `docs/ROADMAP.md`.

---

## 12. Instructions for the AI Coding Agent (updated)

1. Re-confirm the full schema (PRD v1 §4 + all new entities in §2–9 above) and get sign-off before writing feature code — the schema is now large enough that a wrong early decision is expensive.
2. Build a single shared **Policy/Config layer** (backing Module K's Admin Policy Console) *before* implementing Module C's escalation logic or Module F's warning thresholds — both must read from it, proving the "no hardcoding" rule structurally rather than by discipline alone.
3. Build Module H (Notifications) and Module I (Calendar) early, in Stage 1, precisely because every later module depends on them — this prevents each subsequent module from inventing its own notification/date logic (the exact duplication the school explicitly forbade).
4. When implementing Module F (Exam Mode), write the server-side session-gating check (§7.6) *before* the pretty kiosk UI — the security property must not depend on the UI shipping correctly.
5. Flag explicitly, in `docs/DATA_MODEL.md`, every place a rule/threshold is read from a policy table (so a future audit can confirm zero hardcoded business rules).
6. Follow PRD v1 §12's remaining process guidance (small commits, tests per feature, changelog, boring/dependency-light choices) unchanged.

# PRD v3 — Addendum: Module L — Legal, Data Protection & Rights Compliance (EU/DE)

This is an addendum to PRD v1 (Academics Core) and PRD v2 (full module map A–K). It adds **Module L**, which every other module must satisfy, and updates several existing entities to be compliant with **EU GDPR (DSGVO)**, the **German Federal Data Protection Act (BDSG)**, and — critically, because schools are public bodies — the **state-level School Acts (Landesschulgesetze) and School Data Protection Ordinances (Schul-Datenschutzverordnungen)**, which vary across all 16 German Bundesländer and often override or supplement the GDPR baseline for public schools.

> **Hard disclaimer to carry into the product and into `docs/`:** This PRD gives the *engineering* requirements needed to make compliance *possible*. It is not legal advice, and this document (nor any AI tool) can make the final legal determination for a specific school. Every school deploying this platform **must** involve its own **Datenschutzbeauftragter (DPO)**, its **Schulträger** (school authority), and — for co-determination matters — its **Personalrat/Lehrerrat** before go-live. Encode this as a literal onboarding gate in the product (§L.9).

---

## L.1 Governing Framework (what applies, and why it's layered)

1. **GDPR (DSGVO)** — the EU-wide baseline: lawful basis (Art. 6), special category data (Art. 9), children's data (Art. 8), data protection by design/default (Art. 25), records of processing (Art. 30), DPIA (Art. 35), data subject rights (Art. 12–22), processor agreements (Art. 28).
2. **BDSG** — German federal implementing law, adds specifics (e.g., § 26 BDSG on employee data processing — relevant to teacher accounts, audit logs, and any monitoring capability).
3. **Landesschulgesetz** (state School Act) of the school's Bundesland — this is usually the actual **legal basis** for processing student data in a public school (Art. 6(1)(c)/(e) GDPR: legal obligation / public task), **not** consent — consent is often the *wrong* legal basis for a school-student relationship because of the power imbalance, except for genuinely optional features (e.g., opting into the Learning Hub's game leaderboard, or the newsletter-style features).
4. **Schul-Datenschutzverordnung / VO-DV I / equivalent** per state — the operative rules on retention periods, which data categories a school may collect, video/photo rules, cloud-hosting rules, and pupil-file (Schülerakte) handling. **These differ by state and must not be hardcoded** (§L.6).
5. **Landespersonalvertretungsgesetz (LPVG) / BPersVG** — governs **co-determination rights of the staff council (Personalrat)** for public-sector employees (teachers are usually civil servants/public employees) — this is the legal hook for **teacher rights** around any system that can monitor behavior or performance (§L.4).
6. **KJSG / Kinderrechte / UN-Kinderrechtskonvention** — general child-rights framework informing "best interests of the child" design choices (age-appropriate UI, no dark patterns, no manipulative engagement mechanics in the Learning Hub's game module).

---

## L.2 Data Protection by Design & by Default (Art. 25) — mapped to existing modules

Apply these to every module from PRD v2, not just new ones:

- **Data minimization at the schema level:** re-audit every entity in Modules A–K; any optional field must default to *not collected*. Example already flagged in PRD v1 §4: `Student.dateOfBirth` is nullable — keep it that way, and only populate it if the school's state rules actually require it for the pupil file.
- **Purpose limitation:** each table/module must document, in `docs/DATA_MODEL.md`, the specific legal basis and purpose for that data (e.g., `ExamWarning` → purpose: exam integrity & pedagogical record; legal basis: Schulgesetz duty to ensure fair assessment conditions).
- **Pseudonymization where feasible:** e.g., `AiTutorInteraction` (Module E) should store a pseudonymous student reference plus subject/competency context by default, resolvable to the real student only through an access-controlled join, not stored redundantly in logs/exports.
- **Storage limitation:** every entity with personal data needs a `retentionPolicyRef` pointing to Module L's retention config (§L.6), and a scheduled job that flags/executes deletion once the retention period lapses — not a manual "someone remembers to clean this up" process.
- **Access control by default = deny:** reaffirm PRD v1 §5's authorization-by-role, extended: a Teacher's default access to a student is **scoped to classes they currently teach that student in** — losing that assignment (end of enrollment/school year) must automatically narrow their access, not require a manual revoke.

---

## L.3 Special-Category & Sensitive Data (Art. 9 GDPR) — flag every touchpoint

Several features from PRD v2 can touch **special category data** (health, and potentially religion/ethnicity if ever captured, though this platform should **never** collect race/ethnicity/religion/sexual orientation/union membership/political opinion — explicitly out of scope, no field for it anywhere in the schema):

- **Exam "distress signal"** (Module F, §7): a student signaling they feel unwell during a test is **health-adjacent data**. Requirements:
  - Store only a minimal event flag (`ExamIncidentEvent.type = DISTRESS_SIGNAL`) plus optional free text the student/teacher chooses to add — never a structured "symptom" or diagnosis field.
  - Restrict visibility to the involved teacher + admin/counseling on a need-to-know basis; do **not** surface it on general dashboards or to other teachers by default.
  - Short default retention unless the incident escalates into a formal record (e.g., leads to an actual accommodation or medical event requiring documentation) — configurable per school policy (§L.6), but default to the shortest period that satisfies the school's duty of care.
- **Disciplinary records** (`DisciplinaryRecord`, Module C/F) are not Art. 9 special-category data per se, but are highly sensitive personal data about a minor — apply the same need-to-know visibility model, and make `visibleToParent` a real, enforced access-control flag, not just a UI toggle.
- **Counseling notices** (Module B, §3) must never broadcast identifying detail on general-audience displays — the whole point of the "counseling notice ≠ emergency alert" distinction in PRD v2 is to avoid exposing a student's need for support to the wider school.
- **Foreign-student translation** (Module E): a student's home language, inferred from translation requests, is not classic special-category data, but is a data point that can reveal national origin — treat with the same minimization discipline (don't build a persistent "ethnic/linguistic profile," just serve the translation request and discard the routing metadata beyond what's needed for the UI session).

---

## L.4 Teacher Rights & Staff Co-Determination (Personalrat / Unions)

This is a distinct legal track from student data protection — it protects **teachers**, and it is a **hard gate**, not a nice-to-have:

- **Any feature capable of monitoring staff behavior or performance** — this plausibly includes: `AuditLog` entries on teacher actions, message-read receipts, exam-monitor dashboards showing how promptly a teacher responds to a bathroom/distress request, Learning Hub content-authoring approval/rejection rates, or any future "teacher activity" analytics widget — **triggers co-determination rights of the Personalrat (staff council)** under the relevant state's LPVG (or, for federal matters, BPersVG). In the private-sector analogy this is the same principle as § 87(1) No. 6 BetrVG.
- **Product requirement:** before any such feature ships to a real school, it must be documented in a **Dienstvereinbarung-ready spec sheet**: what is logged, who can see it, how long it's kept, and what it will/won't be used for (explicitly: not for unilateral performance evaluation without the Personalrat's agreement). Ship this spec sheet as a generated doc per module (`docs/personalrat/<module>.md`), not just prose buried in this PRD.
- **Union involvement:** recommend the school proactively loop in its **GEW (Gewerkschaft Erziehung und Wissenschaft)** or **VBE** representative and its Personalrat during rollout — not a product feature per se, but the onboarding flow (§L.9) should surface this as a required checklist item before enabling any monitoring-capable module.
- **Teacher data subject rights:** teachers have the same GDPR rights as anyone (access, rectification, erasure where applicable, objection) over their own account data, message logs, and audit trail — build a self-service "my data" export for staff accounts, same mechanism as the student-facing one (PRD v1 §6.9), reused rather than duplicated (per the no-duplication rule).
- **Working-time/communication boundary:** the class-hours messaging lock (Module C) and any after-hours notification behavior should be configurable so the platform doesn't itself become a vector for pressuring teachers to be reachable outside contracted hours — expose a per-teacher "quiet hours" setting for non-urgent notifications (urgent/emergency alerts from Module B always bypass this, by design).

---

## L.5 Student Rights

- **Right of access (Art. 15):** a student (or, for younger students, their parent/guardian on their behalf per §L.7) can request and receive a full export of their data — competency entries, grades, notebook pages, messages, disciplinary records, AI Tutor interaction summaries — reusing the Module K data-export pipeline (PRD v1 §6.9), not a bespoke second exporter.
- **Right to rectification (Art. 16):** factual errors (wrong competency entry, mis-recorded assessment score) must be correctable via the existing edit/audit-logged flows already specified in Module A — no new mechanism needed, just confirm the audit trail satisfies "who changed what, when, why."
- **Right to erasure (Art. 17), bounded by retention duties:** a student's *account* and *actively used* data can be erased on request or on leaving the school, **except** for records the school is legally obligated to retain (e.g., final grades/report cards for the statutory retention period — varies by state, see §L.6). Implement as: erasure request → system erases everything **not** covered by an active retention policy, and clearly reports back what was retained and why (transparency even in partial erasure).
- **No solely-automated decisions with legal/significant effect (Art. 22):** `ComputedGrade` (Module A) must always have a human teacher confirm/finalize it before it becomes an official grade — this is already implied by PRD v1's "teacher can override" design; make it a **hard requirement**, not optional: a `ComputedGrade` cannot reach `isFinalized = true` without a `finalizedByUserId` (a human). Same principle for `ExamWarning`'s third-strike auto-pause (Module F): the **pause** can be automatic (it's a safety/integrity mechanism, not a "decision about the student" in the Art. 22 sense), but any resulting **disciplinary consequence** requires a human (teacher/admin) to actually create the `DisciplinaryRecord` — the system must never auto-generate a disciplinary entry without a human actor attached.
- **Protection from profiling beyond pedagogical purpose:** competency/AI-tutor data must not be repurposed into any kind of broader "student risk score" or similar without an entirely separate legal basis and DPIA — explicitly out of scope; flag this as a **forbidden feature**, not just an unbuilt one, in `docs/ROADMAP.md`'s "will not build" section.

---

## L.6 Retention Periods — config-driven, not hardcoded (extends §0.2/§0.3 from PRD v2)

German statutory retention periods for pupil records (Zeugnisse, Schülerakten, Prüfungsunterlagen, etc.) **vary by Bundesland** and sometimes by record type (e.g., final Abitur-related records often must be kept far longer than routine coursework). Do not hardcode a single number anywhere.

- New entity: `DataRetentionPolicy` — id, schoolId, dataCategory (enum mapping to the entities above: LEARNING_PROGRESS, ASSESSMENT_RESULT, FINAL_REPORT, DISCIPLINARY_RECORD, EXAM_INCIDENT, MESSAGE, AI_TUTOR_LOG, NOTEBOOK_PAGE, SIGNAGE_LOG), retentionPeriodMonths, legalBasisNote (free text — admin/DPO fills in the state-specific rule they're relying on), reviewedByUserId, reviewedAt.
- Every module that writes personal data must resolve its retention period from this table at write time or via a scheduled sweep — never assume a number in application code.
- Ship the table **empty of defaults for legally-mandated categories** (force the school's DPO to actually fill in their state's correct numbers rather than shipping a guessed default that could be wrong) — but ship **sensible short defaults for non-mandated, product-only categories** (e.g., `AI_TUTOR_LOG` summary retention defaulting to something modest like 12 months, editable).

---

## L.7 Parent Rights

- **Information duty (Art. 13/14):** on account creation, parents/guardians receive a plain-language privacy notice (not just a legal-boilerplate one) covering what's collected, why, for how long, and who can see it — generated from the same `DataRetentionPolicy`/module documentation so it can never drift out of sync with what the system actually does.
- **Consultation/approval before rollout:** most German state School Acts require the **Schulkonferenz** and/or **Elternbeirat** to be consulted (and often to formally approve) before a school introduces new pupil-data-processing software. Build this as a literal onboarding checklist step (§L.9) — the product should not let an admin silently "switch on" a new high-impact module (Signage emergency broadcast to parents, Exam Mode, AI Tutor) without acknowledging this step happened.
- **Access to their child's records:** parents get read access to grades, reports, competence flower, and any `DisciplinaryRecord` flagged `visibleToParent` — already specified in Module A/C/F; this section just anchors it as a *legal right*, not a product nicety, so it's never gated behind a paywall or admin discretion in a way that would violate that right.
- **Messaging rights per Module C:** the parent escalation rule (parent → homeroom teacher first, 3 business days, then Admin) is a **product/pedagogical workflow rule**, not a restriction on the parent's underlying legal right to contact the school about their child — make sure the UI frames it as "here's the fastest effective path" and always leaves a true emergency/safety path available that bypasses the queue (tie into Module B's emergency alert / a dedicated "urgent safety concern" contact route that skips the escalation gate entirely).

---

## L.8 School's Rights & Obligations (Controller Responsibilities)

- **Controller vs. processor:** the school (via its Schulträger) is normally the **data controller**; if a self-hosted instance is operated by the school itself, the school is both controller and, practically, its own processor/operator (simplifies Art. 28 needs). If a third party (e.g., the agency building this, or a hosting provider) operates the instance *for* the school, an **Art. 28 Auftragsverarbeitungsvertrag (AVV)** is required — ship a template AVV in `docs/legal/avv-template.md`, clearly marked as a **starting draft for the school's DPO/lawyer to finalize**, not a ready-to-sign legal document.
- **Records of Processing Activities (Art. 30):** generate a `docs/legal/verzeichnis-verarbeitungstaetigkeiten.md` (RoPA) directly from the module/entity documentation — every module in PRD v2 already needs a purpose+legal-basis note (§L.2); assembling those into the formal Art. 30 register should be close to mechanical, not a separate research project.
- **DPIA trigger (Art. 35):** this platform, taken as a whole, plausibly meets the criteria for a **mandatory Datenschutz-Folgenabschätzung** — large-scale processing of children's data, systematic monitoring (Exam Mode's behavior warnings, Signage's emergency systems), and special-category-adjacent data (health signals). **Do not let a school go live with Modules F (Exam Mode) or E (AI Tutor) without a completed DPIA on file** — build this as an actual admin-facing gate: those modules stay disabled in the Admin Policy Console until a `DpiaRecord` (id, schoolId, moduleScope, completedAt, approvedByUserId, documentRef) exists for them.
- **Datenschutzbeauftragter (DPO) role:** add `DPO` as a permission profile in Module K — not a full admin, but someone with read access to the compliance surfaces (RoPA, retention policy table, DPIA records, audit logs across the school) and the specific power to **gate-approve** high-risk modules before they activate.

---

## L.9 Product-Level Compliance Onboarding Gate

Concretely implement the above as a **required onboarding flow for every new school instance**, before the platform is usable for real student data:

1. Enter Schulträger/DPO contact details.
2. Fill in the state (Bundesland) → auto-loads that state's known retention-period *prompts* (labels only — the school must still confirm actual numbers; never silently assume) into `DataRetentionPolicy`.
3. Acknowledge Elternbeirat/Schulkonferenz consultation status per module before that module can be turned on for real use (a simple checklist, logged with who/when).
4. Acknowledge Personalrat consultation status for any monitoring-capable module (§L.4), same mechanism.
5. Complete/upload the DPIA before Modules E and F unlock (§L.8).
6. Only after these steps does the Admin Policy Console (PRD v2 §9.4) allow those modules to leave "disabled" state.

This turns "must comply with EU/German data protection law" from a documentation aspiration into an actual enforced product flow — consistent with PRD v2 §0's "no hardcoding / everything DB-driven / dynamic" principle: **compliance status itself is DB-driven state that gates feature availability**, not a one-time audit that's forgotten after launch.

---

## L.10 On the `Klotzkette/claude-fuer-deutsches-recht` reference repository

This is a large, community-maintained collection of **Claude Code skills/prompts for German legal practice** (labor law, corporate law, insolvency law, **data protection law**, procedural law, and — relevantly — clusters touching **Schulrecht/Hochschulrecht**, school and higher-education law). It is explicitly published as an **experimental aid for legal drafting workflows**, not a certified compliance product, and its own README repeatedly disclaims that it gives no assurance of correctness or professional-rules compliance.

**Recommended, bounded use for this project:**
- Use its `datenschutzrecht` (data protection law) skill as a **drafting assistant** when preparing the AVV template (§L.8), the RoPA structure (§L.8), and the parent-facing privacy notice (§L.7) — i.e., as a way to get a solid first draft faster, in the correct German legal style/structure.
- Do **not** treat any output from it (or from this PRD, or from Claude generally) as a substitute for sign-off by the school's actual Datenschutzbeauftragter or legal counsel — encode that caveat directly into any generated legal-adjacent document (`docs/legal/*.md` files should carry a header disclaimer).
- It is a **prompt/skill library**, not a code dependency — it has no runtime role in the application itself; keep it entirely out of the app's dependency tree and treat it purely as a tool the development team (or the school's admin/DPO) can consult while authoring the compliance documents in `docs/legal/`.

---

## L.11 Updated Definition of Done (compliance-specific additions)

On top of PRD v1 §10 and PRD v2 §11, a school instance is **not** considered production-ready until:

- [ ] `docs/DATA_MODEL.md` has a purpose + legal-basis note for every entity holding personal data.
- [ ] `DataRetentionPolicy` rows exist (school-confirmed, not defaulted) for every legally-mandated category.
- [ ] `docs/legal/verzeichnis-verarbeitungstaetigkeiten.md` (RoPA) is generated and reviewed.
- [ ] AVV signed (if a third party operates the instance) or explicitly marked not-applicable (self-hosted-by-school).
- [ ] DPIA completed and on file before Modules E (AI Tutor) or F (Exam Mode) are enabled.
- [ ] Elternbeirat/Schulkonferenz consultation logged per module.
- [ ] Personalrat consultation logged for every monitoring-capable module.
- [ ] Student/parent/teacher self-service data-export flows tested end-to-end.
- [ ] Privacy notice generator produces an accurate, plain-language notice reflecting actual configured retention periods (no drift between docs and DB config).

# PRD (Consolidated) — "SchoolOS" — A Free, Self-Hosted, All-in-One School Platform

*(Digidoo-inspired competency core, expanded into a full school operations platform, fully EU/German data-protection compliant. This document merges and supersedes the three prior drafts — Digidoo-clone build prompt, School Platform PRD v2, and Legal Compliance addendum v3 — into a single reference PRD.)*

---

## 0. Mission & Non-Negotiable Principles

This is a **free, donation-supported school project**, not a commercial SaaS. It is being built for a real school; any support it receives goes back to the school. These principles override every design decision in this document:

1. **DB: SQLite.** Single-file, self-hostable, cheap to run and back up. (One narrow exception: an optional embedded vector store for AI search — §9 — which can also run fully local/in-process.)
2. **No hardcoding, anywhere.** Every list, label, rule, threshold, escalation window, warning count, template, retention period, and permission must come from the database or an admin-editable config table — never a constant baked into code. If a value could plausibly differ between two schools, two German states, or change next semester, it is a DB row, not a literal.
3. **No mock data, ever** — not in dev, not in demo, not in shipped UI. Seed scripts may create *realistic sample rows* for local development (clearly documented as seed data, easily wiped), but the shipped application must never silently render placeholder/fake data as if real.
4. **No duplicate functionality across pages.** Every capability lives in exactly one canonical place (e.g., all dates live only in the Calendar module; all alerts render only through the Notifications module). Before adding any feature, check whether an existing module already owns that responsibility; extend it there or surface it as a read-only widget — never rebuild it.
5. **Tablet-first, touch-first**, with full parity and a well-adapted layout for desktop/PC. This is the primary device class for teachers and students in-classroom.
6. **Everything is dynamic and role/permission-aware**, driven by real DB relationships (school → year → class → subject → student → user), never assumed.
7. **Fully compliant with EU and German data protection law** (GDPR/DSGVO, BDSG, and the relevant state's Schulgesetz/Schul-Datenschutzverordnung), with explicit, engineered protections for student rights, teacher rights and staff co-determination (Personalrat/unions), parent rights, and the school's own controller obligations — detailed fully in **Module L** (§11). This is not a documentation afterthought: compliance status is itself DB-driven state that gates feature availability (§11.9).
8. Recommended open-source license: **AGPLv3** (prevents a third party from taking this free/community project and reselling it closed-source without contributing back) — team to confirm.

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

---

## 3. Tech Stack

- **Frontend**: React (or Next.js in a single full-stack app) + TypeScript. UI: Tailwind CSS + shadcn/ui. Charting: Recharts or Chart.js (radar chart for the Competence Flower).
- **Backend**: Next.js (App Router) full-stack, keeping frontend + backend in one deployable app — simplest for a small volunteer team.
- **Database**: **SQLite** via **Prisma ORM** (or Drizzle — pick one, justify). Reasoning: trivial hosting (single file, easy backups, ample for a single school's scale), migrations + type safety, and a documented upgrade path to Postgres if a school ever outgrows SQLite (avoid SQLite-only quirks in app logic to keep this portable).
- **Auth**: Self-hosted email/password (argon2id hashing) + session cookies (Lucia Auth / Auth.js credentials provider). No third-party paid auth. Optional TOTP 2FA.
- **PDF generation**: `@react-pdf/renderer` or Puppeteer-based HTML-to-PDF for report cards.
- **File storage**: Local filesystem (school-hosted), abstracted behind a storage interface so S3-compatible storage can be swapped in later.
- **Hosting target**: Single Docker container / docker-compose with a volume for the SQLite file + generated files, deployable on a small VPS.
- **i18n**: German and English UI strings from day one (`next-intl` or equivalent) — all UI text through translation keys, never hardcoded.
- **PWA/Kiosk infrastructure**: **Workbox** for the service worker — offline shell caching, reliable kiosk/fullscreen "install as app" behavior, and Web Push delivery (Modules F, H, §9).
- **Worker offloading**: **Comlink** to offload heavy client-side work (stylus stroke processing in the Digital Notebook, client-side AI-translation pre/post-processing) to a Web Worker via simple RPC, keeping the main thread responsive for touch input (§9).
- **AI/semantic search (optional)**: **Chroma**, an embeddable vector database, for semantic search over Learning Hub resources and retrieval-augmented context for the AI Tutor. Keep it behind an interface, not a hard dependency — a school without AI features never needs to run it. Core relational data always stays in SQLite (§0.1); Chroma, if used, stores only content embeddings for retrieval, never core school records (§9).
- **Testing**: Vitest/Jest (unit), Playwright (E2E for critical flows: login, create competency grid, log an entry, generate report, run an exam session).

Deliver `docs/ARCHITECTURE.md` (stack rationale + self-hosting path) and `docs/SELF_HOSTING.md` (Docker deployment for a non-technical school IT admin).

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

Module E must never ship ahead of Module F's server-side test-time gate (§13, phasing).

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

Module F is the highest integrity/device-sensitivity module — see phasing (§13): built last, after the touch/kiosk foundation (§9 tech stack) is mature.

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

## 12. Touch/Tablet UI-UX & AI Infrastructure Notes

- Minimum touch target 44×44pt, larger on primary actions (exam controls, entry-logging buttons).
- Enlarged cards/list rows at tablet breakpoint, denser layout at desktop breakpoint — one responsive design system, not two codebases.
- **Kiosk/fullscreen mode:** Fullscreen API + Workbox service worker (offline shell caching, reliable PWA install, push delivery even when the tab isn't focused).
- Free browser push notifications via the Web Push API — no paid vendor required.
- Full keyboard navigation and screen-reader labels (WCAG 2.1 AA target), extended to Signage (legible from a distance) and Exam Mode (usable with assistive tech even inside lockdown).
- Original visual design — no reuse of Digidoo's illustrations, palette, or copy; a small design-token set (colors, spacing, typography), warm and education-appropriate, distinct accent color.
- Mobile/tablet-first specifically for the entry-logging flow; desktop-first is fine for admin/setup and reports.
- German and English complete from day one; default German (DACH audience), English complete since this is an open project others may adopt.
- Empty states and an onboarding checklist for a brand-new school ("1. Create your first class → 2. Assign a competency grid → 3. Add students → 4. Log your first entry").

---

## 13. Non-Functional Requirements

- **Self-hostability:** one `docker-compose.yml`, one `.env.example`, a `README.md` a non-expert school IT person can follow — target under 10 commands from `git clone` to a running app.
- **Performance:** SQLite + server-rendered pages where sensible; paginate long lists (rosters, entry timelines).
- **Backups:** documented, scripted daily backup (cron copying the SQLite file + files directory); consider `litestream`; document SQLite's concurrent-write limits and when a school should be advised to migrate to Postgres.
- **Security:** Zod (or equivalent) input validation at every API boundary, parameterized queries only, secure cookie flags, rate limiting on auth endpoints, dependency vulnerability scanning in CI. Exam Mode integrity is defense-in-depth (§9.6). Emergency Alerts (§5) need the lowest possible latency path, treated as fire-drill-grade reliability, with explicit failure/retry testing.
- **Data minimization:** AI Tutor logging defaults to summary-only (§8); Digital Notebook stroke data is exportable/erasable like any other student record (§11.5).
- **Accessibility:** WCAG 2.1 AA across all modules.
- **CI/CD:** GitHub Actions running lint, typecheck, unit tests, E2E smoke tests on every PR.

---

## 14. Project Structure (suggested)

```
/app                # Next.js App Router pages
  /(auth)
  /(dashboard)
  /api
/components
/lib
  /db                # Prisma/Drizzle client, schema
  /grading           # pure grading calculation functions + tests
  /reports           # report generation + PDF rendering
  /permissions       # authorization helpers
  /compliance        # retention sweeps, DPIA gate checks, RoPA generation
/prisma (or /drizzle)
  schema.prisma
  seed.ts
  migrations/
/docs
  ARCHITECTURE.md
  SELF_HOSTING.md
  DATA_MODEL.md        # ER diagram + entity descriptions + purpose/legal-basis notes
  CONTRIBUTING.md
  ROADMAP.md            # incl. explicit "will not build" section
  /legal
    avv-template.md
    verzeichnis-verarbeitungstaetigkeiten.md
  /personalrat
    <module>.md          # co-determination spec sheets per monitoring-capable module
/tests
  unit/
  e2e/
docker-compose.yml
.env.example
README.md
LICENSE
```

---

## 15. Revised MVP Phasing

Given the scope, ship in **stages**, each fully functional and demo-able:

**Stage 1 — Foundation:** Identity/roles/schools/classes/students, Module A (Academics Core) end-to-end, Calendar (Module I) as the shared date backbone, Notifications (Module H) skeleton, Dashboard/Widgets (Module J, 2–3 widgets), and the **compliance foundation**: `DataRetentionPolicy` table, `docs/DATA_MODEL.md` purpose/legal-basis notes, and the onboarding gate skeleton (§11.9 steps 1–2).

**Stage 2 — Communication & Signage:** Module C in full (messaging, escalation policy engine, social rooms, class lock, the urgent-safety bypass path), Module B (signage, including Emergency Alert override), wired into Module H/I. Add onboarding gate steps 3–4 (Elternbeirat/Schulkonferenz and Personalrat consultation logging) since Module C introduces monitoring-adjacent surfaces (read receipts, audit trail).

**Stage 3 — Learning & AI:** Module D (Learning Hub, manual authoring first, AI-assist fast-follow), Module E (AI Tutor with hard test-time gating from day one — never ship before Module F's gate exists). DPIA gate (§11.9 step 5) must be functional before Module E can be enabled for real use.

**Stage 4 — Exam Mode & Digital Notebook:** Module F (kiosk lockdown, warnings, monitor view) and Module G (typed + stylus notebook, teacher annotation) — highest-integrity/most device-sensitive modules, saved for last so the touch/kiosk foundation is mature first, and gated behind the completed DPIA per §11.9.

Each stage gets its own seed data, test-suite additions, and `docs/ROADMAP.md` entry.

---

## 16. Definition of Done (MVP + full platform)

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
19. Test suite: unit tests for grading logic, permissions, and the escalation-policy business-day calculator specifically (not just an overall coverage %); Playwright E2E covering register → create class → assign template → add students → log entries → generate report, plus a signage-emergency-override smoke test and an exam-session lifecycle smoke test.

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

`README.md` should state the project's mission plainly: a free tool built for/with a school, donation-supported, and explain how to contribute.

---

## 17. Phase 2 / Stretch Goals (out of scope for v1 — document in `docs/ROADMAP.md`)

- SSO (OIDC) support for schools with existing identity providers.
- Optional Postgres deployment mode for larger multi-school instances.
- Native offline-first PWA mode for spotty classroom Wi-Fi.
- **Explicitly forbidden, not just deferred (§11.5):** any feature that repurposes competency/AI-Tutor/behavioral data into a cross-context "student risk score" or similar profiling construct without a wholly separate legal basis and DPIA.

---

## 18. Instructions for the AI Coding Agent

1. Produce `docs/ARCHITECTURE.md` and the **full** Prisma/Drizzle schema (all entities across §4–11) and get sign-off before writing app code — this schema is large enough that an early wrong decision is expensive.
2. Build the shared **Policy/Config layer** (backing the Admin Policy Console, §11.4, and `DataRetentionPolicy`, §11.5) **before** implementing Module C's escalation logic or Module F's warning thresholds — both must read from it, proving "no hardcoding" structurally, not just by discipline.
3. Build Module H (Notifications) and Module I (Calendar) early, in Stage 1, precisely because every later module depends on them — prevents each module from inventing its own notification/date logic.
4. When implementing Module F, write the **server-side session-gating check** before the kiosk UI — the security/integrity property must not depend on the UI shipping correctly.
5. Flag explicitly, in `docs/DATA_MODEL.md`, every place a rule/threshold/retention-period is read from a policy table, and every entity's purpose + legal basis (so a future compliance audit can confirm zero hardcoded business rules and a complete RoPA).
6. Never enable Module E or F for a school instance until the corresponding onboarding-gate step (§11.9) is satisfied — build this as an actual code-level check, not a documented process someone might skip.
7. Keep commits small and descriptive; maintain a CHANGELOG. After each feature, write its unit/E2E tests before moving to the next.
8. Flag any point where a competency/grading/retention policy varies by German Bundesland — expose it as configuration, never hardcode one state's rules, and note the assumption in `docs/DATA_MODEL.md`.
9. Remember throughout: **this is a free, non-commercial, donation-supported school project.** Prefer boring, dependency-light, self-hostable solutions over anything introducing a paid third-party service or vendor lock-in — and treat every compliance requirement in §11 as a hard constraint, not a stretch goal.