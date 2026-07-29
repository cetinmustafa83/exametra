import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const studentIdParam = searchParams.get('studentId');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) return NextResponse.json([]);

    let studentId = studentIdParam;

    // If student is requesting their own data
    if (session.user?.role === 'STUDENT' && !studentId) {
      const student = await db.student.findFirst({
        where: { userId: session.userId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!student) return NextResponse.json([]);
      studentId = student.id;
    }

    if (!studentId) return NextResponse.json([]);

    // Verify access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (!student || student.userId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const studyPlans = await db.studyPlan.findMany({
      where: { schoolId, studentId, status: 'active' },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    // Get recent sessions
    const recentSessions = await db.studySession.findMany({
      where: { schoolId, studentId },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    // Get weekly stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekSessions = await db.studySession.findMany({
      where: {
        schoolId,
        studentId,
        status: 'completed',
        startTime: { gte: oneWeekAgo },
      },
    });

    const totalMinutesThisWeek = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    const subjectTimeMap = new Map<string, number>();
    weekSessions.forEach(s => {
      const name = s.subjectName ?? 'Other';
      subjectTimeMap.set(name, (subjectTimeMap.get(name) ?? 0) + s.duration);
    });

    return NextResponse.json({
      plans: studyPlans,
      recentSessions,
      weeklyStats: {
        totalMinutes: totalMinutesThisWeek,
        sessionsCount: weekSessions.length,
        subjectBreakdown: Object.fromEntries(subjectTimeMap),
      },
    });
  } catch (error) {
    console.error('StudyPlanner GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const {
      schoolId,
      studentId,
      title,
      description,
      subjectId,
      subjectName,
      dayOfWeek,
      startTime,
      duration,
      isRecurring,
      specificDate,
      priority,
      color,
      notes,
    } = body;

    if (!schoolId || !studentId || !title || dayOfWeek === undefined || !startTime || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { userId: true, schoolId: true },
      });
      if (!student || student.userId !== session.userId || student.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const plan = await db.studyPlan.create({
      data: {
        schoolId,
        studentId,
        title,
        description: description || null,
        subjectId: subjectId || null,
        subjectName: subjectName || null,
        dayOfWeek,
        startTime,
        duration,
        isRecurring: isRecurring ?? true,
        specificDate: specificDate ? new Date(specificDate) : null,
        priority: priority || 'medium',
        color: color || null,
        notes: notes || null,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('StudyPlanner POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
