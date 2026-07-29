import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, date, startTime, endTime, eventType, subjectId, classGroupId, notes, allDay } = body;

    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

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

    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await db.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CalendarEvent DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
