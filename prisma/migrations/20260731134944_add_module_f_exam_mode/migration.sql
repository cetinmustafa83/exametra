-- CreateTable
CREATE TABLE "exam_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "submittedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" REAL,
    "totalPoints" REAL,
    "lockdownEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cameraMonitor" BOOLEAN NOT NULL DEFAULT false,
    "screenShare" BOOLEAN NOT NULL DEFAULT false,
    "environmentNotes" TEXT,
    "suspiciousActivity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_sessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exam_sessions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exam_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCorrect" BOOLEAN,
    "pointsAwarded" REAL,
    "reviewedAt" DATETIME,
    CONSTRAINT "exam_answers_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "exam_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "description" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "exam_events_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "exam_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_warnings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "warningType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_warnings_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "exam_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "exam_sessions_schoolId_idx" ON "exam_sessions"("schoolId");

-- CreateIndex
CREATE INDEX "exam_sessions_assessmentId_idx" ON "exam_sessions"("assessmentId");

-- CreateIndex
CREATE INDEX "exam_sessions_studentId_idx" ON "exam_sessions"("studentId");

-- CreateIndex
CREATE INDEX "exam_sessions_status_idx" ON "exam_sessions"("status");

-- CreateIndex
CREATE INDEX "exam_answers_examSessionId_idx" ON "exam_answers"("examSessionId");

-- CreateIndex
CREATE INDEX "exam_answers_questionId_idx" ON "exam_answers"("questionId");

-- CreateIndex
CREATE INDEX "exam_events_examSessionId_idx" ON "exam_events"("examSessionId");

-- CreateIndex
CREATE INDEX "exam_events_eventType_idx" ON "exam_events"("eventType");

-- CreateIndex
CREATE INDEX "exam_warnings_examSessionId_idx" ON "exam_warnings"("examSessionId");

-- CreateIndex
CREATE INDEX "exam_warnings_studentId_idx" ON "exam_warnings"("studentId");
