import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, date, startTime, endTime, eventType, subjectId, classGroupId, notes, allDay, schoolId } = body;

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
        eventType: eventType || 'reminder',
        subjectId: subjectId || null,
        classGroupId: classGroupId || null,
        notes: notes || null,
        allDay: allDay ?? false,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
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

    const events = await db.calendarEvent.findMany({
      where: {
        schoolId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('CalendarEvent GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
