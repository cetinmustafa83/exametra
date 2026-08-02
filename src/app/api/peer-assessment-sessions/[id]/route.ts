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
    const assessmentSession = await db.peerAssessmentSession.findFirst({
      where: { id, deletedAt: null },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        peerAssessments: {
          where: { deletedAt: null },
          include: {
            assessor: {
              select: { id: true, firstName: true, lastName: true },
            },
            assessed: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== assessmentSession.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For students: hide assessor identity in anonymous mode
    if (session.user?.role === 'STUDENT' && assessmentSession.anonymityMode === 'anonymous') {
      assessmentSession.peerAssessments = assessmentSession.peerAssessments.map((pa) => ({
        ...pa,
        assessor: pa.isAnonymous
          ? { id: 'hidden', firstName: 'Anonym', lastName: '' }
          : pa.assessor,
      }));
    }

    return NextResponse.json(assessmentSession);
  } catch (error) {
    console.error('PeerAssessmentSession GET [id] error:', error);
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
    const existing = await db.peerAssessmentSession.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL' &&
      existing.teacherId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      assessmentType,
      criteria,
      anonymityMode,
      status,
      deadline,
      assignMode,
      assignedPairs,
    } = body;

    const updated = await db.peerAssessmentSession.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(assessmentType !== undefined && { assessmentType }),
        ...(criteria !== undefined && { criteria: JSON.stringify(criteria) }),
        ...(anonymityMode !== undefined && { anonymityMode }),
        ...(status !== undefined && { status }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(assignMode !== undefined && { assignMode }),
        ...(assignedPairs !== undefined && { assignedPairs: JSON.stringify(assignedPairs) }),
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PeerAssessmentSession PUT [id] error:', error);
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
    const existing = await db.peerAssessmentSession.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL' &&
      existing.teacherId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete session and all related assessments
    await db.peerAssessment.updateMany({
      where: { sessionId: id },
      data: { deletedAt: new Date() },
    });
    await db.peerAssessmentSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PeerAssessmentSession DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
