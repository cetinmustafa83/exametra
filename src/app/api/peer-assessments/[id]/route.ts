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
    const assessment = await db.peerAssessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessor: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessed: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        rubric: {
          select: { id: true, title: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== assessment.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('PeerAssessment GET [id] error:', error);
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
    const existing = await db.peerAssessment.findFirst({
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
      level,
      comment,
      assessmentType,
      competencyId,
      classGroupId,
      rubricId,
      isAnonymous,
    } = body;

    if (level !== undefined && level !== null && (level < 1 || level > 6)) {
      return NextResponse.json({ error: 'level must be between 1 and 6' }, { status: 400 });
    }

    const updated = await db.peerAssessment.update({
      where: { id },
      data: {
        ...(level !== undefined && { level: level ?? null }),
        ...(comment !== undefined && { comment }),
        ...(assessmentType !== undefined && { assessmentType }),
        ...(competencyId !== undefined && { competencyId: competencyId || null }),
        ...(classGroupId !== undefined && { classGroupId: classGroupId || null }),
        ...(rubricId !== undefined && { rubricId: rubricId || null }),
        ...(isAnonymous !== undefined && { isAnonymous }),
      },
      include: {
        assessor: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessed: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        rubric: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PeerAssessment PUT [id] error:', error);
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
    const existing = await db.peerAssessment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.peerAssessment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PeerAssessment DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
