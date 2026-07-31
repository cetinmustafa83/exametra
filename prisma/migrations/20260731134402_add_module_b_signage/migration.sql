-- CreateTable
CREATE TABLE "emergency_signages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "signageType" TEXT NOT NULL DEFAULT 'digital_display',
    "resolution" TEXT NOT NULL DEFAULT '1920x1080',
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentMessageId" TEXT,
    "brightness" INTEGER NOT NULL DEFAULT 100,
    "volume" INTEGER NOT NULL DEFAULT 50,
    "ipAddress" TEXT,
    "lastHeartbeat" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "emergency_signages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signage_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "signageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "displayDuration" INTEGER NOT NULL DEFAULT 10,
    "soundAlert" BOOLEAN NOT NULL DEFAULT false,
    "soundFile" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "signage_messages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signage_messages_signageId_fkey" FOREIGN KEY ("signageId") REFERENCES "emergency_signages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signage_messages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signage_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "signageId" TEXT NOT NULL,
    "messageId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signage_schedules_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signage_schedules_signageId_fkey" FOREIGN KEY ("signageId") REFERENCES "emergency_signages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signage_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signage_audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signage_audit_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "signage_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "emergency_signages_schoolId_idx" ON "emergency_signages"("schoolId");

-- CreateIndex
CREATE INDEX "emergency_signages_isActive_idx" ON "emergency_signages"("isActive");

-- CreateIndex
CREATE INDEX "signage_messages_schoolId_idx" ON "signage_messages"("schoolId");

-- CreateIndex
CREATE INDEX "signage_messages_signageId_idx" ON "signage_messages"("signageId");

-- CreateIndex
CREATE INDEX "signage_messages_messageType_idx" ON "signage_messages"("messageType");

-- CreateIndex
CREATE INDEX "signage_messages_priority_idx" ON "signage_messages"("priority");

-- CreateIndex
CREATE INDEX "signage_schedules_schoolId_idx" ON "signage_schedules"("schoolId");

-- CreateIndex
CREATE INDEX "signage_schedules_signageId_idx" ON "signage_schedules"("signageId");

-- CreateIndex
CREATE INDEX "signage_audit_logs_schoolId_idx" ON "signage_audit_logs"("schoolId");

-- CreateIndex
CREATE INDEX "signage_audit_logs_messageId_idx" ON "signage_audit_logs"("messageId");

-- CreateIndex
CREATE INDEX "signage_audit_logs_action_idx" ON "signage_audit_logs"("action");
