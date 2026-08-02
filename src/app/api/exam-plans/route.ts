// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { differenceInCalendarDays } from 'date-fns';

// ── GET: List exam plans with filters ──────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const teacherId = searchParams.get('teacherId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const viewMode = searchParams.get('viewMode') ?? 'all'; // all, upcoming, past

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (classId) where.classGroupId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    // Date filters
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    // View mode filters
    const now = new Date();
    if (viewMode === 'upcoming') {
      where.date = { ...((where.date as Record<string, Date>) || {}), gte: now };
    } else if (viewMode === 'past') {
      where.date = { ...((where.date as Record<string, Date>) || {}), lt: now };
    }

    // Role-based access
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
    } else if (session.user?.role === 'PARENT') {
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
    } else if (session.user?.role === 'TEACHER') {
      // Teachers see their own exams by default, or all if explicitly requested
      if (!teacherId) {
        where.teacherId = session.userId;
      }
    }

    const examPlans = await db.examPlan.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        calendarEvent: { select: { id: true } },
        assessment: { select: { id: true, title: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Add computed fields
    const enriched = examPlans.map((plan) => {
      const daysUntil = differenceInCalendarDays(new Date(plan.date), now);
      const isWithinTwoWeeks = daysUntil >= 0 && daysUntil <= 14;
      return {
        ...plan,
        daysUntil,
        isWithinTwoWeeks,
        countdownLabel:
          daysUntil === 0
            ? 'today'
            : daysUntil === 1
              ? 'tomorrow'
              : daysUntil < 7
                ? `${daysUntil} days`
                : daysUntil < 14
                  ? `${Math.floor(daysUntil / 7)} week`
                  : `${Math.floor(daysUntil / 7)} weeks`,
      };
    });

    // Check for AI test availability for each exam
    const examIdsWithTests = await db.aITestGeneration.findMany({
      where: {
        classGroupId: { in: enriched.map((e) => e.classGroupId) },
        subjectId: { in: enriched.map((e) => e.subjectId) },
        isCompleted: true,
      },
      select: { classGroupId: true, subjectId: true },
    });

    const testSet = new Set(
      examIdsWithTests.map((t) => `${t.classGroupId}-${t.subjectId}`)
    );

    const result = enriched.map((plan) => ({
      ...plan,
      hasAITest: testSet.has(`${plan.classGroupId}-${plan.subjectId}`),
    }));

    // Statistics (for admin view)
    let stats = null;
    if (
      session.user?.role === 'SCHOOL_ADMIN' ||
      session.user?.role === 'VICE_PRINCIPAL' ||
      session.user?.role === 'SUPER_ADMIN'
    ) {
      const totalExams = await db.examPlan.count({ where: { schoolId } });
      const upcomingExams = await db.examPlan.count({
        where: { schoolId, date: { gte: now } },
      });
      const plannedExams = await db.examPlan.count({
        where: { schoolId, status: 'planned' },
      });
      const confirmedExams = await db.examPlan.count({
        where: { schoolId, status: 'confirmed' },
      });
      const completedExams = await db.examPlan.count({
        where: { schoolId, status: 'completed' },
      });
      const cancelledExams = await db.examPlan.count({
        where: { schoolId, status: 'cancelled' },
      });

      // Exams per subject
      const examsPerSubject = await db.examPlan.groupBy({
        by: ['subjectId'],
        where: { schoolId },
        _count: { id: true },
      });

      const subjectNames = await db.subject.findMany({
        where: {
          id: { in: examsPerSubject.map((e) => e.subjectId) },
        },
        select: { id: true, name: true },
      });

      const subjectMap = Object.fromEntries(
        subjectNames.map((s) => [s.id, s.name])
      );

      // Exams per class
      const examsPerClass = await db.examPlan.groupBy({
        by: ['classGroupId'],
        where: { schoolId },
        _count: { id: true },
      });

      const classNames = await db.classGroup.findMany({
        where: {
          id: { in: examsPerClass.map((e) => e.classGroupId) },
        },
        select: { id: true, name: true },
      });

      const classMap = Object.fromEntries(
        classNames.map((c) => [c.id, c.name])
      );

      stats = {
        totalExams,
        upcomingExams,
        byStatus: { planned: plannedExams, confirmed: confirmedExams, completed: completedExams, cancelled: cancelledExams },
        bySubject: examsPerSubject.map((e) => ({
          subjectId: e.subjectId,
          subjectName: subjectMap[e.subjectId] || e.subjectId,
          count: e._count.id,
        })),
        byClass: examsPerClass.map((e) => ({
          classGroupId: e.classGroupId,
          className: classMap[e.classGroupId] || e.classGroupId,
          count: e._count.id,
        })),
      };
    }

    return NextResponse.json({ exams: result, stats });
  } catch (error) {
    console.error('ExamPlans GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create an exam plan ──────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      date,
      startTime,
      endTime,
      subjectId,
      classGroupId,
      schoolId,
      room,
      topics,
      weight,
      status,
      notes,
    } = body;

    if (!title || !date || !schoolId || !subjectId || !classGroupId) {
      return NextResponse.json(
        { error: 'title, date, schoolId, subjectId, and classGroupId are required' },
        { status: 400 }
      );
    }

    // Create the exam plan
    const examPlan = await db.examPlan.create({
      data: {
        schoolId,
        teacherId: session.userId,
        subjectId,
        classGroupId,
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
        topics: topics ? JSON.stringify(topics) : null,
        weight: weight ?? 1.0,
        status: status || 'planned',
        notes: notes || null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Also create a CalendarEvent for the exam
    const calendarEvent = await db.calendarEvent.create({
      data: {
        schoolId,
        teacherId: session.userId,
        title: `[Exam] ${title}`,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        eventType: 'exam',
        subjectId,
        classGroupId,
        notes: notes || null,
        allDay: !startTime && !endTime,
      },
    });

    // Link the calendar event to the exam plan
    await db.examPlan.update({
      where: { id: examPlan.id },
      data: { calendarEventId: calendarEvent.id },
    });

    const result = {
      ...examPlan,
      calendarEventId: calendarEvent.id,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('ExamPlans POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
