// CompetenceTrack — Notifications API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// In-memory store for read notification IDs (per server instance)
const readNotificationIds = new Set<string>();

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const schoolId = session.user.schoolId;
  const role = session.user.role;

  if (!schoolId) {
    return NextResponse.json({
      upcomingAssessments: [],
      missingObservations: [],
      unreadCount: 0,
    });
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

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

  if (targetClassIds.length === 0) {
    return NextResponse.json({
      upcomingAssessments: [],
      missingObservations: [],
      unreadCount: 0,
    });
  }

  // Upcoming assessments (next 7 days, not completed)
  const upcomingAssessments = await db.assessment.findMany({
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

  const assessmentNotifications = upcomingAssessments
    .filter((a) => a.assessmentResults.length === 0)
    .map((a) => {
      const diffMs = new Date(a.date).getTime() - now.getTime();
      const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const id = `assessment-${a.id}`;
      return {
        id,
        type: 'assessment' as const,
        title: a.title,
        description: `${a.classGroup.name} · ${a.subject.name}`,
        daysUntil,
        timestamp: t('notifications.in_days', { days: String(daysUntil) }),
        classGroupId: a.classGroupId,
        subjectId: a.subjectId,
        assessmentId: a.id,
        isRead: readNotificationIds.has(id),
      };
    });

  // Students with no progress entries in last 14 days
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

  const missingObservations = activeEnrollments
    .filter((e) => e.student.learningProgressEntries.length === 0)
    .map((e) => {
      const id = `missing-${e.student.id}-${e.classGroupId}`;
      // Calculate days since last progress (use 14 as default since we filtered for 14 days)
      return {
        id,
        type: 'missing_observation' as const,
        title: `${e.student.firstName} ${e.student.lastName}`,
        description: e.classGroup.name,
        daysSince: 14,
        timestamp: t('notifications.days_ago', { days: '14' }),
        studentId: e.student.id,
        classGroupId: e.classGroupId,
        isRead: readNotificationIds.has(id),
      };
    });

  // Limit to 10 most relevant
  const limitedMissing = missingObservations.slice(0, 10);

  const allItems = [...assessmentNotifications, ...limitedMissing];
  const unreadCount = allItems.filter((n) => !n.isRead).length;

  return NextResponse.json({
    upcomingAssessments: assessmentNotifications,
    missingObservations: limitedMissing,
    unreadCount,
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids } = body as { ids?: string[] };

    if (ids && Array.isArray(ids)) {
      for (const id of ids) {
        readNotificationIds.add(id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Helper — minimal i18n for server-side timestamps
function t(key: string, params?: Record<string, string>): string {
  const dict: Record<string, string> = {
    'notifications.in_days': 'in {days} Tagen',
    'notifications.days_ago': 'vor {days} Tagen',
  };
  let text = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return text;
}
