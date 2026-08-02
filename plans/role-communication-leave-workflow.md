# Role, Communication, Leave, And Calendar Workflow

## Objective

Implement role-safe school operations for administrators, vice principals,
teachers, students, and parents. Every API must enforce the same permissions as
the navigation, and student and parent data must stay scoped to the user.

## Invariants

- `SCHOOL_ADMIN` and `SUPER_ADMIN` retain full school/system administration.
- `VICE_PRINCIPAL` never creates, deletes, promotes, resets passwords for, or
  otherwise manages administrator accounts.
- Teachers can only view and update students enrolled in a class they teach.
- Students can only access their linked student record.
- Parents can only access records linked through `ParentStudentLink`.
- Authorization is enforced server-side; menu filtering is only a convenience.

## Phase 1: Role And Data Access Foundation

Status: implemented

Scope:

- Centralize administrator, user-management, and student-management policy.
- Restrict student lists, student detail pages, and class-student APIs.
- Restrict account management to administrators.
- Explicitly prevent vice principals from modifying administrator accounts.
- Narrow student, parent, and teacher menus to their allowed workflows.

Files:

- `src/lib/role-access.ts`
- `src/lib/access-policy.ts`
- `src/app/api/students/route.ts`
- `src/app/api/students/[id]/details/route.ts`
- `src/app/api/classes/[id]/students/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/users/[id]/route.ts`

Verification:

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test`

## Phase 2: Communication Escalation And Groups

Status: implemented

Scope:

- Add a unified communication policy service.
- Route student and parent messages to the responsible class teacher first.
- Persist first-contact timestamp, response timestamp, resolution status, and
  escalation eligibility after five business days.
- Allow teachers to message administrators and vice principals directly.
- Add class and parent group room types, membership generation, and moderator
  visibility for the responsible teacher and administrator.
- Prevent student and parent direct administrator threads before escalation.

Schema work:

- Extend `CommunicationRoom` with audience type, class group, escalation,
  resolution, and visibility state.
- Extend `CommunicationMessage` with attachment metadata and moderation state.
- Add migration and backfill safe defaults for existing rooms.

Verification:

- Unit tests for five-business-day calculation and recipient selection.
- API tests for unauthorized direct escalation and group membership isolation.

Implemented baseline:

- Direct student conversations are assigned to the responsible class teacher.
- Direct conversations store a five-business-day escalation deadline.
- Students and linked parents may escalate unresolved conversations after the
  deadline; the school administrator is then added as a moderator.
- Teachers and administrators can create class-group rooms only for their
  authorized school/class context.
- Membership-based message posting is enforced for group rooms.

## Phase 3: Student And Parent Leave Workflow

Status: implemented

Scope:

- Generalize `IllnessReport` into a leave request workflow for illness,
  personal days, and religious holidays.
- Allow evidence attachment metadata without exposing documents outside the
  approval chain.
- Require parent approval for student requests.
- Notify the responsible teacher after parent approval.
- Require administrator approval before the leave becomes calendar-visible.
- Create calendar records for the student, teacher, and school administration.

Schema work:

- Add leave type, admin approval, review actor/timestamps, evidence metadata,
  and linked calendar event fields to `IllnessReport` or migrate to a dedicated
  `StudentLeaveRequest` model.
- Add notification records for each workflow transition.

Verification:

- Workflow tests covering pending, parent-approved, teacher-notified,
  admin-approved, rejected, and calendar-created states.

Implemented baseline:

- Student requests require a linked parent approval.
- Parent-created requests pass the parent approval stage immediately.
- Parent approval notifies the responsible teacher.
- Final approval is restricted to school and super administrators.
- Final approval creates one class-linked, all-day calendar event and stores the
  event reference on the leave request.
- Evidence documents remain on the leave request and are not placed in calendar
  event notes.

## Phase 4: Teacher Leave And Calendar Visibility

Scope:

- Extend `TeacherAbsence` with administrator approval, vice-principal
  notification, private administrator notes, and evidence attachments.
- Keep teacher absence notifications hidden from students.
- On approval, publish only relevant calendar events to the teacher,
  administrators, and affected class calendars.
- Add explicit calendar audience and owner visibility rules.

Schema work:

- Add a `CalendarEventAudience` relation or an audience JSON replacement with
  recipient users, class groups, and parent visibility.
- Add `privateAdminNotes` and approval data to `TeacherAbsence`.

Verification:

- API tests that prove private notes and unpublished teacher events cannot be
  retrieved by students or parents.

## Phase 5: UI Completion And Regression Coverage

Status: implemented

Scope:

- Render role-specific menu items and communication/leave screens.
- Add escalation countdown/status to student and parent conversations.
- Add approval work queues for teachers, vice principals, and administrators.
- Add calendar visibility controls for teachers and students.
- Add responsive, accessible group and approval UI states.

Verification:

- Role-by-role Playwright journeys.
- API authorization matrix tests for every protected route.
- `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm test`, and
  `pnpm build`.

Implemented baseline:

- Leave cards distinguish parent approval from final administrator approval and
  show calendar publication only after the final approval.
- Student and parent conversation panels expose the escalation action only
  after the five-business-day threshold.
- Escalated rooms visibly identify their administrative escalation state.
- `pnpm typecheck` provides a build-first typecheck that avoids stale generated
  Next type files.

## Dependency Order

1. Phase 1 must precede all others because it establishes reusable access
   predicates.
2. Phase 2 and Phase 3 can begin in parallel after Phase 1.
3. Phase 4 depends on the calendar audience design from Phase 3.
4. Phase 5 depends on completed APIs from Phases 2 through 4.

## Rollback

- All schema changes use additive columns/tables first.
- No existing data is deleted by migrations.
- New policy checks default to deny for unknown roles and missing ownership.

## Phase 6: Endpoint Authorization Hardening

Status: implemented

- User role assignment now uses the same administrator target-protection policy
  as user update/delete operations.
- Class updates and deletion are restricted to school administrators; all class
  reads validate class membership or administrator scope.
- Bulk student creation validates the caller school and a teacher's assigned
  class before creating records.
- Parent-link reads and edits validate teacher student scope and school scope.

## Phase 7: Workflow Scope Hardening

Status: implemented

- Parent communication creation requires an explicitly linked child rather than
  inferring a profile from the parent's own account.
- Parent and student leave list filters reject unlinked student identifiers.
- Communication room deletion is limited to school/super administrators;
  vice principals cannot remove conversation records.
- Administrative room closure verifies the administrator belongs to the room's
  school.

## Phase 8: Leave Record Integrity

Status: implemented

- Teacher absence detail endpoints now require authentication, school scope,
  and either the absence owner or an administrator.
- Teachers cannot alter status, or edit/delete a leave once it is approved.
- Vice principals cannot delete student leave records; reporters may only
  withdraw requests before either approval stage is processed.
