import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Verify the plan belongs to the student
    const existing = await db.studyPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId, schoolId: existing.schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const plan = await db.studyPlan.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        subjectId: body.subjectId ?? undefined,
        subjectName: body.subjectName ?? undefined,
        dayOfWeek: body.dayOfWeek ?? undefined,
        startTime: body.startTime ?? undefined,
        duration: body.duration ?? undefined,
        isRecurring: body.isRecurring ?? undefined,
        specificDate: body.specificDate ? new Date(body.specificDate) : undefined,
        priority: body.priority ?? undefined,
        status: body.status ?? undefined,
        color: body.color ?? undefined,
        notes: body.notes ?? undefined,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('StudyPlan PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const existing = await db.studyPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId, schoolId: existing.schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Soft delete by setting status to cancelled
    await db.studyPlan.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('StudyPlan DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
