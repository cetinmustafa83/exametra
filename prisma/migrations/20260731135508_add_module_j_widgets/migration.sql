-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "title" TEXT,
    "position" INTEGER NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'medium',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "dataSource" TEXT,
    "refreshInterval" INTEGER NOT NULL DEFAULT 300,
    "lastRefresh" DATETIME,
    "cacheData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dashboard_widgets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dashboard_widgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gridColumns" INTEGER NOT NULL DEFAULT 4,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "widgets" TEXT NOT NULL,
    "theme" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dashboard_layouts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dashboard_layouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "widget_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultConfig" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "widget_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dashboard_widgets_schoolId_idx" ON "dashboard_widgets"("schoolId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_userId_idx" ON "dashboard_widgets"("userId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widgetType_idx" ON "dashboard_widgets"("widgetType");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_userId_position_key" ON "dashboard_widgets"("userId", "position");

-- CreateIndex
CREATE INDEX "dashboard_layouts_schoolId_idx" ON "dashboard_layouts"("schoolId");

-- CreateIndex
CREATE INDEX "dashboard_layouts_userId_idx" ON "dashboard_layouts"("userId");

-- CreateIndex
CREATE INDEX "widget_templates_schoolId_idx" ON "widget_templates"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_templates_schoolId_widgetType_key" ON "widget_templates"("schoolId", "widgetType");
