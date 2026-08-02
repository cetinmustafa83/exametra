ALTER TABLE "teacher_absences" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "teacher_absences" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "teacher_absences" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "teacher_absences" ADD COLUMN "privateAdminNotes" TEXT;
ALTER TABLE "teacher_absences" ADD COLUMN "documentUrl" TEXT;
ALTER TABLE "teacher_absences" ADD COLUMN "calendarEventId" TEXT;

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_teacher_absences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'reported',
  "notes" TEXT,
  "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT,
  "approvedAt" DATETIME,
  "privateAdminNotes" TEXT,
  "documentUrl" TEXT,
  "calendarEventId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "teacher_absences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_absences_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_absences_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "teacher_absences_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_teacher_absences" ("id", "schoolId", "teacherId", "startDate", "endDate", "type", "reason", "status", "notes", "approvalStatus", "approvedBy", "approvedAt", "privateAdminNotes", "documentUrl", "calendarEventId", "createdAt", "updatedAt") SELECT "id", "schoolId", "teacherId", "startDate", "endDate", "type", "reason", "status", "notes", "approvalStatus", "approvedBy", "approvedAt", "privateAdminNotes", "documentUrl", "calendarEventId", "createdAt", "updatedAt" FROM "teacher_absences";
DROP TABLE "teacher_absences";
ALTER TABLE "new_teacher_absences" RENAME TO "teacher_absences";
PRAGMA foreign_keys=ON;

CREATE UNIQUE INDEX "teacher_absences_calendarEventId_key" ON "teacher_absences"("calendarEventId");
CREATE INDEX "teacher_absences_approvalStatus_idx" ON "teacher_absences"("approvalStatus");
CREATE INDEX "teacher_absences_schoolId_idx" ON "teacher_absences"("schoolId");
CREATE INDEX "teacher_absences_teacherId_idx" ON "teacher_absences"("teacherId");
CREATE INDEX "teacher_absences_startDate_idx" ON "teacher_absences"("startDate");
