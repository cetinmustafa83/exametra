ALTER TABLE "teacher_absences"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "privateAdminNotes" TEXT,
  ADD COLUMN "documentUrl" TEXT,
  ADD COLUMN "calendarEventId" TEXT;

ALTER TABLE "teacher_absences"
  ADD CONSTRAINT "teacher_absences_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_absences"
  ADD CONSTRAINT "teacher_absences_calendarEventId_fkey"
  FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "teacher_absences_calendarEventId_key" ON "teacher_absences"("calendarEventId");
CREATE INDEX "teacher_absences_approvalStatus_idx" ON "teacher_absences"("approvalStatus");
