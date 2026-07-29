import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateSlotSchema = z.object({
  subjectId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(4).optional(),
  period: z.number().int().min(1).max(8).optional(),
  isBreak: z.boolean().optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

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
    const slot = await db.timetableSlot.findUnique({
      where: { id, deletedAt: null },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Timetable slot not found' }, { status: 404 });
    }

    return NextResponse.json(slot);
  } catch (error) {
    console.error('Timetable GET [id] error:', error);
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
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.timetableSlot.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Timetable slot not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.subjectId !== undefined) updateData.subjectId = parsed.data.subjectId || null;
    if (parsed.data.teacherId !== undefined) updateData.teacherId = parsed.data.teacherId || null;
    if (parsed.data.roomId !== undefined) updateData.roomId = parsed.data.roomId || null;
    if (parsed.data.startTime !== undefined) updateData.startTime = parsed.data.startTime;
    if (parsed.data.endTime !== undefined) updateData.endTime = parsed.data.endTime;
    if (parsed.data.dayOfWeek !== undefined) updateData.dayOfWeek = parsed.data.dayOfWeek;
    if (parsed.data.period !== undefined) updateData.period = parsed.data.period;
    if (parsed.data.isBreak !== undefined) updateData.isBreak = parsed.data.isBreak;

    const slot = await db.timetableSlot.update({
      where: { id },
      data: updateData,
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    console.error('Timetable PUT [id] error:', error);
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
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.timetableSlot.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Timetable slot not found' }, { status: 404 });
    }

    await db.timetableSlot.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Timetable DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
