ALTER TABLE "communication_rooms"
  ADD COLUMN "audienceType" TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN "classGroupId" TEXT,
  ADD COLUMN "escalationEligibleAt" TIMESTAMP(3),
  ADD COLUMN "escalatedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolutionStatus" TEXT NOT NULL DEFAULT 'open';

ALTER TABLE "communication_rooms"
  ADD CONSTRAINT "communication_rooms_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "communication_rooms_classGroupId_idx" ON "communication_rooms"("classGroupId");
CREATE INDEX "communication_rooms_escalationEligibleAt_idx" ON "communication_rooms"("escalationEligibleAt");
