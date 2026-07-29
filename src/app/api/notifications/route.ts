// CompetenceTrack — Notifications API (DB-backed, Enhanced)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const priority = searchParams.get('priority');
  const isRead = searchParams.get('isRead');
  const isArchived = searchParams.get('isArchived');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build where clause for DB notifications
  const where: Record<string, unknown> = {
    userId,
    deletedAt: null,
  };

  if (category && category !== 'all') where.category = category;
  if (priority && priority !== 'all') where.priority = priority;
  if (isRead === 'true') where.isRead = true;
  else if (isRead === 'false') where.isRead = false;
  if (isArchived === 'true') where.isArchived = true;
  else if (isArchived === 'false') where.isArchived = false;
  else if (!isArchived) where.isArchived = false; // default: not archived

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.createdAt = dateFilter;
  }

  // Fetch DB notifications for the current user
  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const unreadCount = await db.notification.count({
    where: {
      userId,
      deletedAt: null,
      isRead: false,
      isArchived: false,
    },
  });

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
  const dynamicNotifications: Array<{
    id: string;
    type: string;
    category: string;
    priority: string;
    title: string;
    message: string;
    isRead: boolean;
    isArchived: boolean;
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
      },
      orderBy: { date: 'asc' },
      take: 10,
    });

    for (const a of assessments) {
      const existing = notifications.find(
        (n) => n.type === 'ASSESSMENT_DUE' && n.relatedId === a.id
      );
      if (!existing) {
        dynamicNotifications.push({
          id: `assessment-${a.id}`,
          type: 'ASSESSMENT_DUE',
          category: 'academic',
          priority: 'high',
          title: a.title,
          message: `${a.classGroup.name} - ${a.subject.name}`,
          isRead: false,
          isArchived: false,
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
            dynamicNotifications.push({
              id: `missing-${e.student.id}-${e.classGroupId}`,
              type: 'MISSING_OBSERVATION',
              category: 'academic',
              priority: 'normal',
              title: `${e.student.firstName} ${e.student.lastName}`,
              message: e.classGroup.name,
              isRead: false,
              isArchived: false,
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
    category: n.category,
    priority: n.priority,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    isArchived: n.isArchived,
    actionUrl: n.actionUrl,
    relatedId: n.relatedId,
    createdAt: n.createdAt.toISOString(),
  }));

  const allNotifications = [...dbNotifications, ...dynamicNotifications];

  // Get statistics
  const totalByCategory = await db.notification.groupBy({
    by: ['category'],
    where: {
      userId,
      deletedAt: null,
      isArchived: false,
    },
    _count: { id: true },
  });

  const stats = {
    byCategory: totalByCategory.map((item) => ({
      category: item.category,
      count: item._count.id,
    })),
  };

  return NextResponse.json({
    notifications: allNotifications,
    unreadCount,
    stats,
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, markAll, action, archiveAll, deleteIds } = body as {
      ids?: string[];
      markAll?: boolean;
      action?: 'read' | 'unread' | 'archive' | 'unarchive';
      archiveAll?: boolean;
      deleteIds?: string[];
    };

    if (markAll) {
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

    if (archiveAll) {
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
          isArchived: false,
        },
        data: { isArchived: true },
      });
      return NextResponse.json({ success: true });
    }

    if (ids && Array.isArray(ids)) {
      const dbIds = ids.filter((id) => !id.startsWith('assessment-') && !id.startsWith('missing-'));
      if (dbIds.length > 0) {
        const updateData: Record<string, unknown> = {};
        if (action === 'read') updateData.isRead = true;
        else if (action === 'unread') updateData.isRead = false;
        else if (action === 'archive') updateData.isArchived = true;
        else if (action === 'unarchive') updateData.isArchived = false;
        else updateData.isRead = true; // default: mark read

        await db.notification.updateMany({
          where: {
            id: { in: dbIds },
            userId: session.user.id,
          },
          data: updateData,
        });
      }
      return NextResponse.json({ success: true });
    }

    if (deleteIds && Array.isArray(deleteIds)) {
      const dbIds = deleteIds.filter((id) => !id.startsWith('assessment-') && !id.startsWith('missing-'));
      if (dbIds.length > 0) {
        await db.notification.updateMany({
          where: {
            id: { in: dbIds },
            userId: session.user.id,
          },
          data: { deletedAt: new Date() },
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
    const { schoolId, userId, type, category, priority, title, message, actionUrl, relatedId } = body as {
      schoolId: string;
      userId: string;
      type: string;
      category?: string;
      priority?: string;
      title: string;
      message: string;
      actionUrl?: string;
      relatedId?: string;
    };

    if (!schoolId || !userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine category from type if not provided
    const categoryMap: Record<string, string> = {
      ASSESSMENT_DUE: 'academic',
      MISSING_OBSERVATION: 'academic',
      NOTEBOOK_SHARED: 'academic',
      BEHAVIOR_ALERT: 'behavioral',
      GRADE_COMPUTED: 'academic',
      ATTENDANCE_ALERT: 'administrative',
      REPORT_READY: 'administrative',
      CALENDAR_EVENT: 'calendar',
      COMMUNICATION: 'communication',
      SYSTEM: 'system',
    };

    const notification = await db.notification.create({
      data: {
        schoolId,
        userId,
        type,
        category: category || categoryMap[type] || 'system',
        priority: priority || 'normal',
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
      const dbIds = ids.filter((id) => !id.startsWith('assessment-') && !id.startsWith('missing-'));
      await db.notification.updateMany({
        where: {
          id: { in: dbIds },
          userId: session.user.id,
        },
        data: { deletedAt: new Date() },
      });
    } else {
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
