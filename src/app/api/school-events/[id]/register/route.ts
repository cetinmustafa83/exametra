import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const event = await db.schoolEvent.findFirst({
      where: { id, deletedAt: null },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && event.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (event.classGroupId && (!session.user || !(await canAccessClass(session.user, event.classGroupId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!event.requiresRegistration) {
      return NextResponse.json({ error: 'Event does not require registration' }, { status: 400 });
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 });
    }

    const body = await request.json();
    const { userId, notes } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (userId !== session.userId && !isAdministrator(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already registered
    const existing = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (existing) {
      if (existing.status === 'cancelled') {
        // Re-register
        const updated = await db.eventRegistration.update({
          where: { id: existing.id },
          data: { status: 'registered', notes: notes || null },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: 'Already registered' }, { status: 409 });
    }

    // Check capacity (use capacity field if available, otherwise maxParticipants)
    const maxCap = event.capacity ?? event.maxParticipants;
    if (maxCap) {
      const count = await db.eventRegistration.count({
        where: { eventId: id, status: 'registered' },
      });
      if (count >= maxCap) {
        return NextResponse.json({ error: 'Event is full', waitlist: true }, { status: 400 });
      }
    }

    const registration = await db.eventRegistration.create({
      data: {
        eventId: id,
        userId,
        notes: notes || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    console.error('EventRegistration POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
    }

    const registration = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    const event = await db.schoolEvent.findFirst({ where: { id, deletedAt: null } });
    if (!event || (session.user?.role !== 'SUPER_ADMIN' && event.schoolId !== session.user?.schoolId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (userId !== session.userId && !isAdministrator(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await db.eventRegistration.update({
      where: { id: registration.id },
      data: { status },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('EventRegistration PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const registration = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    const event = await db.schoolEvent.findFirst({ where: { id, deletedAt: null } });
    if (!event || (session.user?.role !== 'SUPER_ADMIN' && event.schoolId !== session.user?.schoolId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (userId !== session.userId && !isAdministrator(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancel registration (soft delete via status)
    const updated = await db.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'cancelled' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('EventRegistration DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
