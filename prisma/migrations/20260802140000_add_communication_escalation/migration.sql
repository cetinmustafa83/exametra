ALTER TABLE "communication_rooms" ADD COLUMN "audienceType" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "communication_rooms" ADD COLUMN "classGroupId" TEXT;
ALTER TABLE "communication_rooms" ADD COLUMN "escalationEligibleAt" TIMESTAMP(3);
ALTER TABLE "communication_rooms" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "communication_rooms" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "communication_rooms" ADD COLUMN "resolutionStatus" TEXT NOT NULL DEFAULT 'open';

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_communication_rooms" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "roomType" TEXT NOT NULL DEFAULT 'chat',
  "audienceType" TEXT NOT NULL DEFAULT 'direct',
  "classGroupId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "requestedBy" TEXT NOT NULL,
  "escalationEligibleAt" DATETIME,
  "escalatedAt" DATETIME,
  "resolvedAt" DATETIME,
  "resolutionStatus" TEXT NOT NULL DEFAULT 'open',
  "acceptedAt" DATETIME,
  "closedAt" DATETIME,
  "closeReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "communication_rooms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_rooms_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_rooms_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_rooms_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_communication_rooms" ("id", "schoolId", "studentId", "teacherId", "roomType", "audienceType", "classGroupId", "status", "requestedBy", "escalationEligibleAt", "escalatedAt", "resolvedAt", "resolutionStatus", "acceptedAt", "closedAt", "closeReason", "createdAt", "updatedAt") SELECT "id", "schoolId", "studentId", "teacherId", "roomType", "audienceType", "classGroupId", "status", "requestedBy", "escalationEligibleAt", "escalatedAt", "resolvedAt", "resolutionStatus", "acceptedAt", "closedAt", "closeReason", "createdAt", "updatedAt" FROM "communication_rooms";
DROP TABLE "communication_rooms";
ALTER TABLE "new_communication_rooms" RENAME TO "communication_rooms";
PRAGMA foreign_keys=ON;

CREATE INDEX "communication_rooms_classGroupId_idx" ON "communication_rooms"("classGroupId");
CREATE INDEX "communication_rooms_escalationEligibleAt_idx" ON "communication_rooms"("escalationEligibleAt");
CREATE INDEX "communication_rooms_schoolId_idx" ON "communication_rooms"("schoolId");
CREATE INDEX "communication_rooms_studentId_idx" ON "communication_rooms"("studentId");
CREATE INDEX "communication_rooms_teacherId_idx" ON "communication_rooms"("teacherId");
CREATE INDEX "communication_rooms_status_idx" ON "communication_rooms"("status");
