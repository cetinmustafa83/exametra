-- CreateTable
CREATE TABLE "notification_hubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" DATETIME,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "notification_hubs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notification_hubs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_archives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_archives_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notification_archives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "notification_hubs_schoolId_idx" ON "notification_hubs"("schoolId");

-- CreateIndex
CREATE INDEX "notification_hubs_userId_idx" ON "notification_hubs"("userId");

-- CreateIndex
CREATE INDEX "notification_hubs_isRead_idx" ON "notification_hubs"("isRead");

-- CreateIndex
CREATE INDEX "notification_hubs_category_idx" ON "notification_hubs"("category");

-- CreateIndex
CREATE INDEX "notification_hubs_createdAt_idx" ON "notification_hubs"("createdAt");

-- CreateIndex
CREATE INDEX "notification_archives_schoolId_idx" ON "notification_archives"("schoolId");

-- CreateIndex
CREATE INDEX "notification_archives_userId_idx" ON "notification_archives"("userId");

-- CreateIndex
CREATE INDEX "notification_archives_archivedAt_idx" ON "notification_archives"("archivedAt");
