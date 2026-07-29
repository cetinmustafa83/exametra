import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const statusEnum = z.enum(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']);

const updateRecordSchema = z.object({
  status: statusEnum.optional(),
  arrivalTime: z.string().optional(),
  comment: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.attendanceRecord.findUnique({
      where: { id },
      include: {
        session: {
          include: { classGroup: { select: { schoolId: true } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const isTeacher = existing.session.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.session.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.arrivalTime !== undefined) data.arrivalTime = parsed.data.arrivalTime;
    if (parsed.data.comment !== undefined) data.comment = parsed.data.comment;

    const record = await db.attendanceRecord.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('AttendanceRecord PUT error:', error);
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

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.attendanceSession.findUnique({
      where: { id },
      include: { classGroup: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete records first, then session
    await db.attendanceRecord.deleteMany({
      where: { sessionId: id },
    });

    await db.attendanceSession.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.classGroup.schoolId,
        action: 'DELETE',
        entityType: 'AttendanceSession',
        entityId: id,
        metadata: JSON.stringify({
          classGroupId: existing.classGroupId,
          date: existing.date.toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('AttendanceSession DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
