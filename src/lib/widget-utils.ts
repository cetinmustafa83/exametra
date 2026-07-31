import { db } from '@/lib/db';
import type { DashboardWidget } from '@prisma/client';

export const WIDGET_TYPES = {
  GRADE_SUMMARY: 'grade_summary',
  ATTENDANCE_TREND: 'attendance_trend',
  UPCOMING_ASSESSMENTS: 'upcoming_assessments',
  CLASS_SCHEDULE: 'class_schedule',
  WELLNESS_STATUS: 'wellness_status',
  RECENT_MESSAGES: 'recent_messages',
  ANNOUNCEMENTS: 'announcements',
} as const;

export const WIDGET_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  FULL_WIDTH: 'full_width',
} as const;

export const WIDGET_CONFIGS = {
  [WIDGET_TYPES.GRADE_SUMMARY]: {
    dateRange: 'semester',
    showTrend: true,
    colorScheme: 'default',
  },
  [WIDGET_TYPES.ATTENDANCE_TREND]: {
    days: 30,
    showTarget: true,
    unit: 'percentage',
  },
  [WIDGET_TYPES.UPCOMING_ASSESSMENTS]: {
    daysAhead: 14,
    showDueIn: true,
    sortBy: 'dueDate',
  },
  [WIDGET_TYPES.CLASS_SCHEDULE]: {
    view: 'week',
    showLocation: true,
    showTeacher: true,
  },
  [WIDGET_TYPES.WELLNESS_STATUS]: {
    showHistory: true,
    days: 7,
  },
  [WIDGET_TYPES.RECENT_MESSAGES]: {
    limit: 5,
    showUnread: true,
  },
  [WIDGET_TYPES.ANNOUNCEMENTS]: {
    limit: 3,
    priority: 'all',
  },
};

/**
 * Get default widget configuration
 */
export function getDefaultConfig(widgetType: string) {
  return WIDGET_CONFIGS[widgetType as keyof typeof WIDGET_CONFIGS] || {};
}

/**
 * Validate widget position is unique in dashboard
 */
export async function isPositionAvailable(
  userId: string,
  position: number,
  excludeWidgetId?: string
): Promise<boolean> {
  const existing = await db.dashboardWidget.findFirst({
    where: {
      userId,
      position,
      ...(excludeWidgetId && { id: { not: excludeWidgetId } }),
    },
  });
  return !existing;
}

/**
 * Get next available position in dashboard grid
 */
export async function getNextPosition(userId: string, gridSize: number = 12): Promise<number> {
  const widgets = await db.dashboardWidget.findMany({
    where: { userId },
    select: { position: true },
    orderBy: { position: 'desc' },
    take: 1,
  });

  const nextPos = (widgets[0]?.position ?? -1) + 1;
  return nextPos < gridSize ? nextPos : 0;
}

/**
 * Move widget to new position
 */
export async function moveWidget(
  widgetId: string,
  newPosition: number
): Promise<DashboardWidget> {
  return db.dashboardWidget.update({
    where: { id: widgetId },
    data: { position: newPosition, updatedAt: new Date() },
  });
}

/**
 * Get widgets for user dashboard
 */
export async function getUserDashboardWidgets(userId: string, schoolId: string) {
  const widgets = await db.dashboardWidget.findMany({
    where: {
      userId,
      school: { id: schoolId },
      isVisible: true,
    },
    orderBy: { position: 'asc' },
  });

  return widgets.map((w) => ({
    ...w,
    config: w.config ? JSON.parse(w.config) : getDefaultConfig(w.widgetType),
    cacheData: w.cacheData ? JSON.parse(w.cacheData) : null,
  }));
}

/**
 * Update widget cache (called after data refresh)
 */
export async function updateWidgetCache(widgetId: string, data: unknown) {
  return db.dashboardWidget.update({
    where: { id: widgetId },
    data: {
      cacheData: JSON.stringify(data),
      lastRefresh: new Date(),
    },
  });
}

/**
 * Check if widget needs refresh based on interval
 */
export function needsRefresh(lastRefresh: Date | null, interval: number): boolean {
  if (!lastRefresh || interval === 0) return false; // 0 = manual refresh
  const secondsElapsed = (Date.now() - lastRefresh.getTime()) / 1000;
  return secondsElapsed >= interval;
}

/**
 * Save dashboard layout
 */
export async function saveDashboardLayout(
  userId: string,
  schoolId: string,
  name: string,
  widgetPositions: number[],
  isDefault: boolean = false
) {
  return db.dashboardLayout.create({
    data: {
      userId,
      schoolId,
      name,
      widgets: JSON.stringify(widgetPositions),
      isDefault,
    },
  });
}

/**
 * Get user's default or first layout
 */
export async function getUserLayout(userId: string, schoolId: string) {
  const layout = await db.dashboardLayout.findFirst({
    where: {
      userId,
      schoolId,
      isDefault: true,
    },
  });

  if (layout) {
    return {
      ...layout,
      widgets: JSON.parse(layout.widgets),
    };
  }

  // Fall back to first layout
  const first = await db.dashboardLayout.findFirst({
    where: { userId, schoolId },
  });

  return first
    ? {
        ...first,
        widgets: JSON.parse(first.widgets),
      }
    : null;
}
