import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function canManageAbsence(role: string | undefined, teacherId: string, userId: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || (role === 'TEACHER' && teacherId === userId);
}

// GET /api/substitutes/absences/[id] - Get a single absence
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const absence = await db.teacherAbsence.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            substitute: { select: { id: true, firstName: true, lastName: true } },
            classGroup: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!absence) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }
    if (!canManageAbsence(session.user?.role, absence.teacherId, session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && absence.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(absence);
  } catch (error) {
    console.error('Error fetching absence:', error);
    return NextResponse.json({ error: 'Failed to fetch absence' }, { status: 500 });
  }
}

// PUT /api/substitutes/absences/[id] - Update an absence
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const existing = await db.teacherAbsence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }
    if (!canManageAbsence(session.user?.role, existing.teacherId, session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && existing.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (existing.approvalStatus !== 'pending' && session.user?.role === 'TEACHER') {
      return NextResponse.json({ error: 'Approved leave cannot be edited by the teacher' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    const simpleFields = session.user?.role === 'TEACHER' ? ['type', 'reason', 'notes'] : ['type', 'reason', 'status', 'notes'];

    for (const field of simpleFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);

    const absence = await db.teacherAbsence.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: true,
      },
    });

    return NextResponse.json(absence);
  } catch (error) {
    console.error('Error updating absence:', error);
    return NextResponse.json({ error: 'Failed to update absence' }, { status: 500 });
  }
}

// DELETE /api/substitutes/absences/[id] - Delete an absence
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;

    const existing = await db.teacherAbsence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }
    if (!canManageAbsence(session.user?.role, existing.teacherId, session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && existing.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (existing.approvalStatus === 'approved' && session.user?.role === 'TEACHER') {
      return NextResponse.json({ error: 'Approved leave cannot be deleted by the teacher' }, { status: 400 });
    }

    // Delete associated assignments first
    await db.substitutionAssignment.deleteMany({ where: { absenceId: id } });
    await db.teacherAbsence.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting absence:', error);
    return NextResponse.json({ error: 'Failed to delete absence' }, { status: 500 });
  }
}
