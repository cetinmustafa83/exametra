import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getTeacherClassIds } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';
import { addDays, addWeeks, addMonths, addYears, format, getDay } from 'date-fns';

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

function generateChildEvents(
  parentEvent: {
    id: string;
    schoolId: string;
    teacherId: string;
    title: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    eventType: string;
    subjectId: string | null;
    classGroupId: string | null;
    notes: string | null;
    allDay: boolean;
  },
  pattern: RecurrencePattern,
  recurrenceEnd: Date | null
) {
  const children: Array<{
    schoolId: string;
    teacherId: string;
    title: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    eventType: string;
    subjectId: string | null;
    classGroupId: string | null;
    notes: string | null;
    allDay: boolean;
    parentEventId: string;
    recurrencePattern: string;
  }> = [];

  const maxDate = recurrenceEnd ?? new Date(pattern.endDate ?? '2026-12-31');
  const patternJson = JSON.stringify(pattern);
  let currentDate = parentEvent.date;

  // Generate up to 365 occurrences to prevent infinite loops
  let count = 0;
  const maxOccurrences = 365;

  while (count < maxOccurrences) {
    // Advance to next occurrence
    if (pattern.type === 'daily') {
      currentDate = addDays(currentDate, pattern.interval);
    } else if (pattern.type === 'weekly') {
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        // Find next day of week within the week
        let nextDate = addDays(currentDate, 1);
        let found = false;
        let weekCounter = 0;
        while (!found && weekCounter < 7 * pattern.interval) {
          if (pattern.daysOfWeek.includes(getDay(nextDate))) {
            currentDate = nextDate;
            found = true;
          } else {
            nextDate = addDays(nextDate, 1);
            weekCounter++;
          }
        }
        if (!found) {
          currentDate = addWeeks(currentDate, pattern.interval);
        }
      } else {
        currentDate = addWeeks(currentDate, pattern.interval);
      }
    } else if (pattern.type === 'monthly') {
      currentDate = addMonths(currentDate, pattern.interval);
    } else if (pattern.type === 'yearly') {
      currentDate = addYears(currentDate, pattern.interval);
    }

    if (currentDate > maxDate) break;

    children.push({
      schoolId: parentEvent.schoolId,
      teacherId: parentEvent.teacherId,
      title: parentEvent.title,
      date: new Date(currentDate),
      startTime: parentEvent.startTime,
      endTime: parentEvent.endTime,
      eventType: parentEvent.eventType,
      subjectId: parentEvent.subjectId,
      classGroupId: parentEvent.classGroupId,
      notes: parentEvent.notes,
      allDay: parentEvent.allDay,
      parentEventId: parentEvent.id,
      recurrencePattern: patternJson,
    });

    count++;
  }

  return children;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, date, startTime, endTime, eventType, subjectId, classGroupId,
      notes, allDay, schoolId, recurrencePattern, recurrenceEnd,
    } = body;

    if (!title || !date || !schoolId) {
      return NextResponse.json({ error: 'title, date, and schoolId are required' }, { status: 400 });
    }

    if (!session.user || (!isAdministrator(session.user.role) && session.user.schoolId !== schoolId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role === 'TEACHER' && classGroupId) {
      const classIds = await getTeacherClassIds(session.user.id);
      if (!classIds.includes(classGroupId)) {
        return NextResponse.json({ error: 'Teachers can only create events for their own classes' }, { status: 403 });
      }
    }
    if (session.user.role === 'STUDENT' || session.user.role === 'PARENT' || session.user.role === 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse recurrence pattern
    let parsedPattern: RecurrencePattern | null = null;
    if (recurrencePattern && recurrencePattern.type && recurrencePattern.type !== 'none') {
      parsedPattern = recurrencePattern as RecurrencePattern;
    }

    const parsedRecurrenceEnd = recurrenceEnd ? new Date(recurrenceEnd) : null;

    // Create the parent event
    const event = await db.calendarEvent.create({
      data: {
        schoolId,
        teacherId: session.user?.id ?? '',
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        eventType: eventType || 'reminder',
        subjectId: subjectId || null,
        classGroupId: classGroupId || null,
        notes: notes || null,
        allDay: allDay ?? false,
        recurrencePattern: parsedPattern ? JSON.stringify(parsedPattern) : null,
        recurrenceEnd: parsedRecurrenceEnd,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        childEvents: {
          select: { id: true, date: true },
        },
      },
    });

    // Generate child events for recurring events
    if (parsedPattern) {
      const childEvents = generateChildEvents(
        {
          id: event.id,
          schoolId: event.schoolId,
          teacherId: event.teacherId,
          title: event.title,
          date: new Date(date),
          startTime: event.startTime,
          endTime: event.endTime,
          eventType: event.eventType,
          subjectId: event.subjectId,
          classGroupId: event.classGroupId,
          notes: event.notes,
          allDay: event.allDay,
        },
        parsedPattern,
        parsedRecurrenceEnd
      );

      if (childEvents.length > 0) {
        await db.calendarEvent.createMany({ data: childEvents });
      }

      // Re-fetch with children
      const updatedEvent = await db.calendarEvent.findUnique({
        where: { id: event.id },
        include: {
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
          childEvents: {
            select: { id: true, date: true },
          },
        },
      });

      return NextResponse.json({ ...updatedEvent, childCount: childEvents.length }, { status: 201 });
    }

    return NextResponse.json({ ...event, childCount: 0 }, { status: 201 });
  } catch (error) {
    console.error('CalendarEvent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const monthParam = searchParams.get('month'); // YYYY-MM

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (!session.user || (!isAdministrator(session.user.role) && session.user.schoolId !== schoolId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let year: number;
    let monthIndex: number;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [yStr, mStr] = monthParam.split('-');
      year = parseInt(yStr, 10);
      monthIndex = parseInt(mStr, 10) - 1;
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthIndex = now.getUTCMonth();
    }

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const eventWhere: Record<string, unknown> = {
      schoolId,
      date: { gte: startOfMonth, lte: endOfMonth },
    };
    if (session.user.role === 'TEACHER') {
      const classIds = await getTeacherClassIds(session.user.id);
      eventWhere.OR = [{ teacherId: session.user.id }, { classGroupId: { in: classIds } }];
    } else if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({ where: { userId: session.user.id }, select: { id: true } });
      const enrollments = student ? await db.enrollment.findMany({ where: { studentId: student.id, endDate: null }, select: { classGroupId: true } }) : [];
      eventWhere.classGroupId = { in: enrollments.map((enrollment) => enrollment.classGroupId) };
    } else if (session.user.role === 'PARENT') {
      const links = await db.parentStudentLink.findMany({ where: { parentId: session.user.id }, select: { studentId: true } });
      const enrollments = await db.enrollment.findMany({ where: { studentId: { in: links.map((link) => link.studentId) }, endDate: null }, select: { classGroupId: true } });
      eventWhere.classGroupId = { in: enrollments.map((enrollment) => enrollment.classGroupId) };
    }

    const events = await db.calendarEvent.findMany({
      where: eventWhere,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        childEvents: {
          select: { id: true, date: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('CalendarEvent GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
