import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
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
        feedbacks: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== event.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('SchoolEvent GET [id] error:', error);
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
    const existing = await db.schoolEvent.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
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
      budget,
      registrationDeadline,
      capacity,
      isRecurring,
      recurrenceRule,
      bannerImageUrl,
      status,
      feedbackForm,
    } = body;

    const updated = await db.schoolEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(eventType !== undefined && { eventType }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(location !== undefined && { location }),
        ...(organizerId !== undefined && { organizerId: organizerId || null }),
        ...(classGroupId !== undefined && { classGroupId: classGroupId || null }),
        ...(isAllSchool !== undefined && { isAllSchool }),
        ...(isPublic !== undefined && { isPublic }),
        ...(requiresRegistration !== undefined && { requiresRegistration }),
        ...(maxParticipants !== undefined && { maxParticipants: maxParticipants || null }),
        ...(notes !== undefined && { notes }),
        ...(budget !== undefined && { budget: budget ?? null }),
        ...(registrationDeadline !== undefined && { registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null }),
        ...(capacity !== undefined && { capacity: capacity ?? null }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurrenceRule !== undefined && { recurrenceRule: recurrenceRule || null }),
        ...(bannerImageUrl !== undefined && { bannerImageUrl: bannerImageUrl || null }),
        ...(status !== undefined && { status }),
        ...(feedbackForm !== undefined && { feedbackForm: feedbackForm || null }),
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
        feedbacks: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('SchoolEvent PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.schoolEvent.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.schoolEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SchoolEvent DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
