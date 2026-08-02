import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';
import { addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns';

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[];
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
  let count = 0;
  const maxOccurrences = 365;

  while (count < maxOccurrences) {
    if (pattern.type === 'daily') {
      currentDate = addDays(currentDate, pattern.interval);
    } else if (pattern.type === 'weekly') {
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title, date, startTime, endTime, eventType, subjectId, classGroupId,
      notes, allDay, recurrencePattern, recurrenceEnd, editMode,
    } = body;

    const existing = await db.calendarEvent.findUnique({
      where: { id },
      include: { childEvents: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!session.user || (!isAdministrator(session.user.role) && existing.teacherId !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role !== 'SUPER_ADMIN' && existing.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (classGroupId && !(await canAccessClass(session.user, classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If editing a single instance of a recurring event
    if (editMode === 'instance' && existing.parentEventId) {
      const event = await db.calendarEvent.update({
        where: { id },
        data: {
          title: title ?? existing.title,
          date: date ? new Date(date) : existing.date,
          startTime: startTime !== undefined ? startTime : existing.startTime,
          endTime: endTime !== undefined ? endTime : existing.endTime,
          eventType: eventType ?? existing.eventType,
          subjectId: subjectId !== undefined ? subjectId : existing.subjectId,
          classGroupId: classGroupId !== undefined ? classGroupId : existing.classGroupId,
          notes: notes !== undefined ? notes : existing.notes,
          allDay: allDay !== undefined ? allDay : existing.allDay,
        },
        include: {
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(event);
    }

    // If editing the series (parent event)
    let parsedPattern: RecurrencePattern | null = null;
    if (recurrencePattern && recurrencePattern.type && recurrencePattern.type !== 'none') {
      parsedPattern = recurrencePattern as RecurrencePattern;
    }
    const parsedRecurrenceEnd = recurrenceEnd ? new Date(recurrenceEnd) : null;

    // Update the parent event
    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        date: date ? new Date(date) : existing.date,
        startTime: startTime !== undefined ? startTime : existing.startTime,
        endTime: endTime !== undefined ? endTime : existing.endTime,
        eventType: eventType ?? existing.eventType,
        subjectId: subjectId !== undefined ? subjectId : existing.subjectId,
        classGroupId: classGroupId !== undefined ? classGroupId : existing.classGroupId,
        notes: notes !== undefined ? notes : existing.notes,
        allDay: allDay !== undefined ? allDay : existing.allDay,
        recurrencePattern: parsedPattern ? JSON.stringify(parsedPattern) : null,
        recurrenceEnd: parsedRecurrenceEnd,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    // Delete existing child events and regenerate
    if (existing.childEvents.length > 0) {
      await db.calendarEvent.deleteMany({
        where: { parentEventId: id },
      });
    }

    // Generate new child events if recurring
    let childCount = 0;
    if (parsedPattern) {
      const childEvents = generateChildEvents(
        {
          id: event.id,
          schoolId: event.schoolId,
          teacherId: event.teacherId,
          title: event.title,
          date: event.date,
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
        childCount = childEvents.length;
      }
    }

    return NextResponse.json({ ...event, childCount });
  } catch (error) {
    console.error('CalendarEvent PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteMode = searchParams.get('mode'); // 'series' or 'instance'

    const existing = await db.calendarEvent.findUnique({
      where: { id },
      include: { childEvents: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!session.user || (!isAdministrator(session.user.role) && existing.teacherId !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role !== 'SUPER_ADMIN' && existing.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If deleting a single instance, just delete that one
    if (deleteMode === 'instance') {
      await db.calendarEvent.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // If this is a parent recurring event, delete all children too
    if (existing.childEvents.length > 0) {
      await db.calendarEvent.deleteMany({
        where: { parentEventId: id },
      });
    }

    // If this is a child event and deleting series, delete parent and all siblings
    if (existing.parentEventId && deleteMode === 'series') {
      const parent = await db.calendarEvent.findUnique({
        where: { id: existing.parentEventId },
        include: { childEvents: true },
      });
      if (parent) {
        await db.calendarEvent.deleteMany({
          where: { parentEventId: parent.id },
        });
        await db.calendarEvent.delete({ where: { id: parent.id } });
      }
      return NextResponse.json({ success: true });
    }

    await db.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CalendarEvent DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
