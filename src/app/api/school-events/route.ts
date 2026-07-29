import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const eventType = searchParams.get('eventType');
    const classGroupId = searchParams.get('classGroupId');
    const upcoming = searchParams.get('upcoming');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (eventType) where.eventType = eventType;
    if (classGroupId) where.classGroupId = classGroupId;

    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
    }

    const events = await db.schoolEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        registrations: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('SchoolEvent GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      organizerId,
      classGroupId,
      isAllSchool,
      isPublic,
      requiresRegistration,
      maxParticipants,
      notes,
      isDemo,
    } = body;

    if (!schoolId || !title || !eventType || !startDate) {
      return NextResponse.json(
        { error: 'schoolId, title, eventType, and startDate are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event = await db.schoolEvent.create({
      data: {
        schoolId,
        title,
        description: description || null,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        organizerId: organizerId || null,
        classGroupId: classGroupId || null,
        isAllSchool: isAllSchool ?? true,
        isPublic: isPublic ?? true,
        requiresRegistration: requiresRegistration ?? false,
        maxParticipants: maxParticipants || null,
        notes: notes || null,
        isDemo: isDemo ?? false,
      },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        registrations: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('SchoolEvent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
