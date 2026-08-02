import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

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
    const disciplinaryCase = await db.disciplinaryCase.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        committee: {
          select: {
            id: true,
            name: true,
            members: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!disciplinaryCase) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && disciplinaryCase.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, disciplinaryCase.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(disciplinaryCase);
  } catch (error) {
    console.error('DisciplinaryCases GET [id] error:', error);
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
    const { status, resolution, reviewedBy } = body;

    const existing = await db.disciplinaryCase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && existing.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    // Check if user is committee member or admin
    const isCommitteeMember = await db.disciplinaryCommitteeMember.findFirst({
      where: { committeeId: existing.committeeId, userId },
    });
    const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';

    if (!isCommitteeMember && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (reviewedBy || status === 'under_review' || status === 'resolved' || status === 'dismissed') {
      updateData.reviewedBy = reviewedBy || userId;
    }
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolutionDate = new Date();
    }

    const updatedCase = await db.disciplinaryCase.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        committee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error('DisciplinaryCases PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
