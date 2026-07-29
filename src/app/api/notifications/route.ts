// CompetenceTrack — Notifications API (DB-backed)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const schoolId = session.user.schoolId;

  if (!schoolId) {
    return NextResponse.json({
      notifications: [],
      unreadCount: 0,
    });
  }

  // Fetch DB notifications for the current user
  const notifications = await db.notification.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Also generate dynamic notifications from existing data
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const role = session.user.role;

  // Get teacher's class IDs
  const teacherClasses = await db.classGroupTeacher.findMany({
    where: { userId },
    select: { classGroupId: true },
  });
  const classGroupIds = teacherClasses.map((tc) => tc.classGroupId);

  // For admin, get all classes in the school
  let targetClassIds = classGroupIds;
  if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') {
    const schoolClasses = await db.classGroup.findMany({
      where: { schoolId },
      select: { id: true },
    });
    targetClassIds = schoolClasses.map((c) => c.id);
  }

  // For students, get their enrolled class IDs
  if (role === 'STUDENT') {
    const student = await db.student.findFirst({
      where: { schoolId },
      include: {
        enrollments: {
          where: { endDate: null },
          select: { classGroupId: true },
        },
      },
    });
    if (student) {
      targetClassIds = student.enrollments.map((e) => e.classGroupId);
    }
  }

  // Upcoming assessments (next 7 days)
  const upcomingAssessments: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl: string | null;
    relatedId: string | null;
    createdAt: string;
  }> = [];

  if (targetClassIds.length > 0) {
    const assessments = await db.assessment.findMany({
      where: {
        classGroupId: { in: targetClassIds },
        date: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        classGroup: { select: { name: true } },
        subject: { select: { name: true } },
        assessmentResults: { select: { id: true } },
      },
      orderBy: { date: 'asc' },
      take: 10,
    });

    for (const a of assessments) {
      const diffMs = new Date(a.date).getTime() - now.getTime();
      const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      // Check if we already have a DB notification for this assessment
      const existing = notifications.find(
        (n) => n.type === 'ASSESSMENT_DUE' && n.relatedId === a.id
      );
      if (!existing) {
        upcomingAssessments.push({
          id: `assessment-${a.id}`,
          type: 'ASSESSMENT_DUE',
          title: a.title,
          message: `${a.classGroup.name} - ${a.subject.name}`,
          isRead: false,
          actionUrl: 'assessments',
          relatedId: a.id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Missing observations (students with no progress in 14 days) - only for teachers
    if (role !== 'STUDENT') {
      const activeEnrollments = await db.enrollment.findMany({
        where: {
          classGroupId: { in: targetClassIds },
          endDate: null,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              learningProgressEntries: {
                where: {
                  date: { gte: fourteenDaysAgo },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
          classGroup: { select: { id: true, name: true } },
        },
      });

      for (const e of activeEnrollments) {
        if (e.student.learningProgressEntries.length === 0) {
          const existing = notifications.find(
            (n) => n.type === 'MISSING_OBSERVATION' && n.relatedId === e.student.id
          );
          if (!existing) {
            upcomingAssessments.push({
              id: `missing-${e.student.id}-${e.classGroupId}`,
              type: 'MISSING_OBSERVATION',
              title: `${e.student.firstName} ${e.student.lastName}`,
              message: e.classGroup.name,
              isRead: false,
              actionUrl: 'progress',
              relatedId: e.student.id,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  // Combine DB notifications with dynamic ones
  const dbNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    actionUrl: n.actionUrl,
    relatedId: n.relatedId,
    createdAt: n.createdAt.toISOString(),
  }));

  const allNotifications = [...dbNotifications, ...upcomingAssessments];

  return NextResponse.json({
    notifications: allNotifications,
    unreadCount: allNotifications.filter((n) => !n.isRead).length,
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

    if (markAll) {
      // Mark all notifications as read
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
          deletedAt: null,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (ids && Array.isArray(ids)) {
      // Mark specific DB notifications as read
      const dbIds = ids.filter((id) => !id.startsWith('assessment-') && !id.startsWith('missing-'));
      if (dbIds.length > 0) {
        await db.notification.updateMany({
          where: {
            id: { in: dbIds },
            userId: session.user.id,
          },
          data: { isRead: true },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { schoolId, userId, type, title, message, actionUrl, relatedId } = body as {
      schoolId: string;
      userId: string;
      type: string;
      title: string;
      message: string;
      actionUrl?: string;
      relatedId?: string;
    };

    if (!schoolId || !userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    return NextResponse.json({ notification }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body as { ids?: string[] };

    if (ids && Array.isArray(ids)) {
      // Soft-delete specific notifications
      await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        data: { deletedAt: new Date() },
      });
    } else {
      // Soft-delete all notifications for the user
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
