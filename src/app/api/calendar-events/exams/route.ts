import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { differenceInCalendarDays } from 'date-fns';

// ── GET: List upcoming exams ──────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const classGroupId = searchParams.get('classGroupId');
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const now = new Date();

    const where: Record<string, unknown> = {
      schoolId,
      eventType: 'exam',
      date: { gte: now },
    };

    if (classGroupId) {
      where.classGroupId = classGroupId;
    }

    // For students: only show exams from their classes
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (student) {
        const enrollments = await db.enrollment.findMany({
          where: { studentId: student.id },
          select: { classGroupId: true },
        });
        const classIds = enrollments.map((e) => e.classGroupId);
        where.classGroupId = { in: classIds };
      }
    }

    // For parents: show exams from their children's classes
    if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      const enrollments = await db.enrollment.findMany({
        where: { studentId: { in: studentIds } },
        select: { classGroupId: true },
      });
      const classIds = enrollments.map((e) => e.classGroupId);
      where.classGroupId = { in: classIds };
    }

    const exams = await db.calendarEvent.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });

    // Add countdown info
    const enrichedExams = exams.map((exam) => {
      const daysUntil = differenceInCalendarDays(new Date(exam.date), now);
      return {
        ...exam,
        daysUntil,
        countdownLabel: daysUntil === 0
          ? 'today'
          : daysUntil === 1
            ? 'tomorrow'
            : daysUntil < 7
              ? `${daysUntil} days`
              : `${Math.floor(daysUntil / 7)} weeks`,
      };
    });

    return NextResponse.json(enrichedExams);
  } catch (error) {
    console.error('Exams GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create an exam event ────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (userRole !== 'TEACHER' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'VICE_PRINCIPAL' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, date, startTime, endTime, subjectId, classGroupId,
      notes, assessmentId, schoolId,
    } = body;

    if (!title || !date || !schoolId) {
      return NextResponse.json({ error: 'title, date, and schoolId are required' }, { status: 400 });
    }

    const event = await db.calendarEvent.create({
      data: {
        schoolId,
        teacherId: session.user?.id ?? '',
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        eventType: 'exam',
        subjectId: subjectId || null,
        classGroupId: classGroupId || null,
        notes: notes || null,
        allDay: !startTime && !endTime,
        assessmentId: assessmentId || null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Exam POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
