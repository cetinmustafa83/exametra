// @ts-nocheck
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
    const appointment = await db.counselingAppointment.findUnique({
      where: { id },
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;
    if (
      role !== 'SCHOOL_ADMIN' &&
      role !== 'SUPER_ADMIN' &&
      role !== 'VICE_PRINCIPAL' &&
      appointment.counselorId !== userId &&
      appointment.studentId !== userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Counseling GET [id] error:', error);
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
    const { scheduledAt, duration, notes, status, addToCalendar } = body;

    const existing = await db.counselingAppointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    // Only counselor, admin, or the student can update
    const isCounselor = existing.counselorId === userId;
    const isStudent = existing.studentId === userId;
    const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';

    if (!isCounselor && !isStudent && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (duration !== undefined) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const appointment = await db.counselingAppointment.update({
      where: { id },
      data: updateData,
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Add to calendar if requested and scheduled
    if (addToCalendar && appointment.scheduledAt && appointment.status === 'scheduled') {
      try {
        await db.calendarEvent.create({
          data: {
            schoolId: appointment.schoolId,
            userId: appointment.counselorId,
            title: `Counseling: ${appointment.student.firstName} ${appointment.student.lastName}`,
            description: `Type: ${appointment.requestType}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
            startTime: appointment.scheduledAt,
            endTime: new Date(new Date(appointment.scheduledAt).getTime() + (appointment.duration || 30) * 60000),
            category: 'meeting',
            isAllDay: false,
          },
        });
      } catch (calErr) {
        console.error('Calendar event creation error:', calErr);
      }
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Counseling PUT [id] error:', error);
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
    const existing = await db.counselingAppointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;
    const isCounselor = existing.counselorId === userId;
    const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';

    if (!isCounselor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appointment = await db.counselingAppointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Counseling DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
