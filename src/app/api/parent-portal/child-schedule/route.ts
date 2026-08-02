// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { differenceInCalendarDays } from 'date-fns';

// GET: Returns the weekly schedule for a child
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden - Parent role required' }, { status: 403 });
    }

    const parentId = session.userId;
    const schoolId = session.user?.schoolId;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId || !schoolId) {
      return NextResponse.json({ error: 'studentId and schoolId are required' }, { status: 400 });
    }

    // Verify parent is linked to this student
    const parentLink = await db.parentStudentLink.findFirst({
      where: { parentId, studentId },
    });
    if (!parentLink) {
      return NextResponse.json({ error: 'You can only view schedule for your children' }, { status: 403 });
    }

    // Get student's class groups
    const enrollments = await db.enrollment.findMany({
      where: { studentId, endDate: null },
      select: { classGroupId: true, classGroup: { select: { id: true, name: true } } },
    });
    const classIds = enrollments.map((e) => e.classGroupId);

    // Timetable slots
    const timetableSlots = classIds.length > 0
      ? await db.timetableSlot.findMany({
          where: {
            schoolId,
            classGroupId: { in: classIds },
            deletedAt: null,
          },
          include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            classGroup: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
        })
      : [];

    // Upcoming exams
    const upcomingExams = classIds.length > 0
      ? await db.calendarEvent.findMany({
          where: {
            schoolId,
            eventType: 'exam',
            classGroupId: { in: classIds },
            date: { gte: new Date() },
          },
          include: {
            subject: { select: { id: true, name: true } },
            classGroup: { select: { id: true, name: true } },
          },
          orderBy: { date: 'asc' },
          take: 15,
        })
      : [];

    // School events
    const schoolEvents = await db.schoolEvent.findMany({
      where: {
        schoolId,
        deletedAt: null,
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        eventType: true,
        location: true,
        organizer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Counseling appointments
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });

    const counselingAppointments = student?.userId
      ? await db.counselingAppointment.findMany({
          where: { studentId: student.userId, schoolId },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          select: {
            id: true,
            requestType: true,
            status: true,
            scheduledAt: true,
            description: true,
            counselor: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

    // Homework due
    const homeworkDue = classIds.length > 0
      ? await db.homework.findMany({
          where: {
            schoolId,
            classGroupId: { in: classIds },
            dueDate: { gte: new Date() },
            isPublished: true,
            deletedAt: null,
          },
          include: {
            subject: { select: { id: true, name: true } },
            classGroup: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        })
      : [];

    return NextResponse.json({
      timetableSlots: timetableSlots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        period: s.period,
        startTime: s.startTime,
        endTime: s.endTime,
        isBreak: s.isBreak,
        subject: s.subject ? { id: s.subject.id, name: s.subject.name, code: s.subject.code } : null,
        teacher: s.teacher ? { id: s.teacher.id, firstName: s.teacher.firstName, lastName: s.teacher.lastName } : null,
        classGroup: { id: s.classGroup.id, name: s.classGroup.name },
      })),
      upcomingExams: upcomingExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        date: exam.date.toISOString(),
        startTime: exam.startTime,
        endTime: exam.endTime,
        subject: exam.subject ? { id: exam.subject.id, name: exam.subject.name } : null,
        classGroup: exam.classGroup ? { id: exam.classGroup.id, name: exam.classGroup.name } : null,
        daysUntil: differenceInCalendarDays(new Date(exam.date), new Date()),
      })),
      schoolEvents: schoolEvents.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
      })),
      counselingAppointments: counselingAppointments.map((a) => ({
        ...a,
        scheduledAt: a.scheduledAt?.toISOString() ?? null,
      })),
      homeworkDue: homeworkDue.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        dueDate: h.dueDate.toISOString(),
        homeworkType: h.homeworkType,
        subject: h.subject ? { id: h.subject.id, name: h.subject.name } : null,
        classGroup: { id: h.classGroup.id, name: h.classGroup.name },
      })),
    });
  } catch (error) {
    console.error('Child Schedule GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
