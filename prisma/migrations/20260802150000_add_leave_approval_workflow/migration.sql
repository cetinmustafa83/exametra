ALTER TABLE "illness_reports"
  ADD COLUMN "leaveType" TEXT NOT NULL DEFAULT 'illness',
  ADD COLUMN "teacherNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "adminApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "adminApprovedBy" TEXT,
  ADD COLUMN "adminApprovedAt" TIMESTAMP(3),
  ADD COLUMN "adminNotes" TEXT,
  ADD COLUMN "calendarEventId" TEXT;

ALTER TABLE "illness_reports"
  ADD CONSTRAINT "illness_reports_adminApprovedBy_fkey"
  FOREIGN KEY ("adminApprovedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "illness_reports"
  ADD CONSTRAINT "illness_reports_calendarEventId_fkey"
  FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "illness_reports_calendarEventId_key" ON "illness_reports"("calendarEventId");
CREATE INDEX "illness_reports_adminApprovalStatus_idx" ON "illness_reports"("adminApprovalStatus");
