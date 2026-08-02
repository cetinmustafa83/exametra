ALTER TABLE "illness_reports" ADD COLUMN "leaveType" TEXT NOT NULL DEFAULT 'illness';
ALTER TABLE "illness_reports" ADD COLUMN "teacherNotifiedAt" TIMESTAMP(3);
ALTER TABLE "illness_reports" ADD COLUMN "adminApprovalStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "illness_reports" ADD COLUMN "adminApprovedBy" TEXT;
ALTER TABLE "illness_reports" ADD COLUMN "adminApprovedAt" TIMESTAMP(3);
ALTER TABLE "illness_reports" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "illness_reports" ADD COLUMN "calendarEventId" TEXT;

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_illness_reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "reportedBy" TEXT NOT NULL,
  "reporterType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME,
  "documentUrl" TEXT,
  "leaveType" TEXT NOT NULL DEFAULT 'illness',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "parentApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  "parentApprovedBy" TEXT,
  "parentApprovedAt" DATETIME,
  "isVisibleToTeacher" BOOLEAN NOT NULL DEFAULT false,
  "isVisibleToAdmin" BOOLEAN NOT NULL DEFAULT false,
  "teacherNotifiedAt" DATETIME,
  "adminApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  "adminApprovedBy" TEXT,
  "adminApprovedAt" DATETIME,
  "adminNotes" TEXT,
  "calendarEventId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "illness_reports_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "illness_reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "illness_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "illness_reports_parentApprovedBy_fkey" FOREIGN KEY ("parentApprovedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "illness_reports_adminApprovedBy_fkey" FOREIGN KEY ("adminApprovedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "illness_reports_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_illness_reports" ("id", "schoolId", "studentId", "reportedBy", "reporterType", "reason", "description", "startDate", "endDate", "documentUrl", "leaveType", "status", "parentApprovalStatus", "parentApprovedBy", "parentApprovedAt", "isVisibleToTeacher", "isVisibleToAdmin", "teacherNotifiedAt", "adminApprovalStatus", "adminApprovedBy", "adminApprovedAt", "adminNotes", "calendarEventId", "createdAt", "updatedAt") SELECT "id", "schoolId", "studentId", "reportedBy", "reporterType", "reason", "description", "startDate", "endDate", "documentUrl", "leaveType", "status", "parentApprovalStatus", "parentApprovedBy", "parentApprovedAt", "isVisibleToTeacher", "isVisibleToAdmin", "teacherNotifiedAt", "adminApprovalStatus", "adminApprovedBy", "adminApprovedAt", "adminNotes", "calendarEventId", "createdAt", "updatedAt" FROM "illness_reports";
DROP TABLE "illness_reports";
ALTER TABLE "new_illness_reports" RENAME TO "illness_reports";
PRAGMA foreign_keys=ON;

CREATE UNIQUE INDEX "illness_reports_calendarEventId_key" ON "illness_reports"("calendarEventId");
CREATE INDEX "illness_reports_adminApprovalStatus_idx" ON "illness_reports"("adminApprovalStatus");
CREATE INDEX "illness_reports_schoolId_idx" ON "illness_reports"("schoolId");
CREATE INDEX "illness_reports_studentId_idx" ON "illness_reports"("studentId");
CREATE INDEX "illness_reports_reportedBy_idx" ON "illness_reports"("reportedBy");
CREATE INDEX "illness_reports_parentApprovalStatus_idx" ON "illness_reports"("parentApprovalStatus");
CREATE INDEX "illness_reports_status_idx" ON "illness_reports"("status");
