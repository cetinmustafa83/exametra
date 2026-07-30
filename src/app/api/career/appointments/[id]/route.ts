import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get single career appointment ───────────────────────────────────
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
    const appointment = await db.careerAppointment.findUnique({
      where: { id },
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        profile: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Career appointment GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update career appointment ───────────────────────────────────────
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
    const { date, duration, type, status, notes, actionItems } = body;

    const existing = await db.careerAppointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (duration !== undefined) updateData.duration = duration;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (actionItems !== undefined) updateData.actionItems = JSON.stringify(actionItems);

    const appointment = await db.careerAppointment.update({
      where: { id },
      data: updateData,
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        profile: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Career appointment PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete career appointment ────────────────────────────────────
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
    const existing = await db.careerAppointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await db.careerAppointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career appointment DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
