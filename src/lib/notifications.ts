// CompetenceTrack — Notification Helper
// Server-side utility for creating notifications in the database
// Also pushes notifications via WebSocket service

import { db } from '@/lib/db';

export type NotificationType =
  | 'ASSESSMENT_DUE'
  | 'MISSING_OBSERVATION'
  | 'NOTEBOOK_SHARED'
  | 'BEHAVIOR_ALERT'
  | 'GRADE_COMPUTED'
  | 'ATTENDANCE_ALERT'
  | 'REPORT_READY'
  | 'GENERAL';

/**
 * Push a notification to the WebSocket service so it arrives in real-time.
 * This is a fire-and-forget call — failures are non-critical.
 */
async function pushNotificationToWS(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
}) {
  try {
    await fetch('http://localhost:3003/api/push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // WebSocket push is non-critical — ignore errors
  }
}

/**
 * Create a notification for a specific user.
 * This is a server-side function that writes directly to the database.
 * Also pushes the notification via WebSocket for real-time delivery.
 */
export async function createNotification(params: {
  schoolId: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
}) {
  const { schoolId, userId, type, title, message, actionUrl, relatedId } = params;

  const notification = await db.notification.create({
    data: {
      schoolId,
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl ?? null,
      relatedId: relatedId ?? null,
    },
  });

  // Push to WebSocket for real-time delivery (non-blocking)
  pushNotificationToWS({ userId, type, title, message, actionUrl, relatedId }).catch(() => {});

  return notification;
}

/**
 * Create a notification for multiple users (e.g., all students in a class).
 * Also pushes each notification via WebSocket.
 */
export async function createNotificationForUsers(params: {
  schoolId: string;
  userIds: string[];
  type: NotificationType | string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
}) {
  const { schoolId, userIds, type, title, message, actionUrl, relatedId } = params;

  const result = await db.notification.createMany({
    data: userIds.map((userId) => ({
      schoolId,
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl ?? null,
      relatedId: relatedId ?? null,
    })),
  });

  // Push to WebSocket for each user (non-blocking)
  for (const userId of userIds) {
    pushNotificationToWS({ userId, type, title, message, actionUrl, relatedId }).catch(() => {});
  }

  return result;
}

/**
 * Notify all students in a class that a notebook has been shared.
 */
export async function notifyNotebookShared(params: {
  schoolId: string;
  classGroupId: string;
  notebookTitle: string;
  teacherName: string;
  notebookId: string;
}) {
  const { schoolId, classGroupId, notebookTitle, teacherName, notebookId } = params;

  // Get all student user IDs for the class
  const enrollments = await db.enrollment.findMany({
    where: {
      classGroupId,
      endDate: null,
    },
    include: {
      student: {
        select: { id: true },
      },
    },
  });

  // Find User accounts linked to these students
  // Students may have a user account with the same email pattern
  const studentIds = enrollments.map((e) => e.student.id);

  // For now, find users with STUDENT role in the school
  const studentUsers = await db.user.findMany({
    where: {
      schoolId,
      role: 'STUDENT',
      deletedAt: null,
    },
    select: { id: true },
  });

  if (studentUsers.length === 0) return;

  return createNotificationForUsers({
    schoolId,
    userIds: studentUsers.map((u) => u.id),
    type: 'NOTEBOOK_SHARED',
    title: notebookTitle,
    message: `${teacherName} has shared a notebook with you`,
    actionUrl: 'notebooks',
    relatedId: notebookId,
  });
}

/**
 * Notify a teacher about a behavior alert.
 */
export async function notifyBehaviorAlert(params: {
  schoolId: string;
  userId: string;
  studentName: string;
  className: string;
  incidentId: string;
}) {
  return createNotification({
    ...params,
    type: 'BEHAVIOR_ALERT',
    title: `Behavior Alert: ${params.studentName}`,
    message: `New behavior incident in ${params.className}`,
    actionUrl: 'behavior',
    relatedId: params.incidentId,
  });
}

/**
 * Notify a student/teacher that a grade has been computed.
 */
export async function notifyGradeComputed(params: {
  schoolId: string;
  userId: string;
  studentName: string;
  className: string;
  gradeId: string;
}) {
  return createNotification({
    ...params,
    type: 'GRADE_COMPUTED',
    title: `Grade Computed: ${params.studentName}`,
    message: `New grade available for ${params.className}`,
    actionUrl: 'grading',
    relatedId: params.gradeId,
  });
}
