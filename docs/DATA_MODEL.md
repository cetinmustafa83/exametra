# Data Model

SchoolOS uses Prisma with SQLite. IDs are portable strings and timestamps are
stored in UTC. The schema is the source of truth; this document is a domain
map, not a replacement for `prisma/schema.prisma`.

## Organization And Identity

- `School`, `SchoolYear`, `SchoolDistrict`: organizational boundaries.
- `User`: authenticated account, role, school membership, locale, and soft
  deletion state.
- `ClassGroup`, `ClassGroupTeacher`, `Enrollment`: teaching assignments and
  current/historical class membership.
- `Student`, `ParentStudentLink`, `ParentContact`, `EmergencyContact`: student
  profile and linked guardians. Access must always be evaluated through the
  active student, parent link, class assignment, and school scope.

## Academic Record

- `Subject`, `CompetencyTemplate`, `CompetencyCategory`, `Competency`, and
  `MasteryLevelDefinition` define editable school competency frameworks.
- `ClassCompetencyAssignment` links a framework to a class.
- `LearningProgressEntry` is the evidence record used by progress, mastery,
  and competence visualizations.
- `Assessment`, `AssessmentCompetencyLink`, and `AssessmentResult` capture
  assessment creation, competency links, and student results.
- `GradingScheme`, `GradingWeightRule`, and `ComputedGrade` hold calculation
  rules and computed outcomes.
- `Report`, `ReportCardTemplate`, and `ReportSection` hold report-card drafts,
  templates, and sections.

## Classroom Operations

- `AttendanceSession` and `AttendanceRecord`: attendance and absence status.
- `LessonPlan`, `Homework`, and `HomeworkSubmission`: instructional planning
  and student work.
- `TimetableSlot`, `CalendarEvent`, `SchoolEvent`, and `EventRegistration`:
  time-bound school activity.
- `TeacherAbsence`, substitute models, transport models, and library checkout
  models support daily school operations.

## Student Support And Communication

- `TeacherNote`, `BehaviorCategory`, `BehaviorIncident`, and
  `BehaviorIntervention`: staff-only support context.
- `IllnessReport`, `CounselingAppointment`, `HealthRecord`, and `Wellness`
  models contain sensitive information; they require strict role, student, and
  school checks.
- `CommunicationRoom`, `CommunicationRoomMember`, `CommunicationMessage`,
  `ParentMessage`, `Announcement`, and `Notification` provide communication
  and delivery records.

## Student Work And Learning Hub

- `Notebook`, `NotebookPage`, `NotebookPageVersion`, and `Drawing` store
  digital student work and version history.
- `Resource`, `SubjectCategory`, `SubjectContent`, `SubjectTopic`,
  `SubjectLesson`, and `LessonQuestion` represent learning content.
- Badge, reward, competition, portfolio, goal, and study-plan models support
  student-facing learning workflows.

## Compliance And Audit

- `AuditLog` records sensitive operational actions.
- `DataExportRequest`, `DeletionFlag`, `DataRetentionPolicy`, `DpiaRecord`,
  `ComplianceConsultation`, and `SchoolComplianceStatus` support rights,
  retention, and governance workflows.
- `Backup` stores metadata for storage-backed backup files; backup files live
  below `BACKUP_PATH` and must not be placed in the database.

## Change Rules

- Additive schema changes require a Prisma migration and an updated seed path.
- Never rename or remove a stored field without a migration/backfill plan.
- New personal-data fields require a purpose, access policy, audit requirement,
  export behavior, erasure behavior, and retention category before release.
- New feature tables must include school scope where the data is school-owned.
