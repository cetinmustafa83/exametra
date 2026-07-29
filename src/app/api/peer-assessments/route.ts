import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const assessedId = searchParams.get('assessedId');
    const assessorId = searchParams.get('assessorId');
    const competencyId = searchParams.get('competencyId');
    const classGroupId = searchParams.get('classGroupId');
    const assessmentType = searchParams.get('assessmentType');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (assessedId) where.assessedId = assessedId;
    if (assessorId) where.assessorId = assessorId;
    if (competencyId) where.competencyId = competencyId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (assessmentType) where.assessmentType = assessmentType;

    const assessments = await db.peerAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('PeerAssessment GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      assessorId,
      assessedId,
      competencyId,
      classGroupId,
      assessmentType,
      level,
      comment,
      rubricId,
      isAnonymous,
      isDemo,
    } = body;

    if (!schoolId || !assessorId || !assessedId || !assessmentType) {
      return NextResponse.json(
        { error: 'schoolId, assessorId, assessedId, and assessmentType are required' },
        { status: 400 }
      );
    }

    if (level !== undefined && level !== null && (level < 1 || level > 6)) {
      return NextResponse.json(
        { error: 'level must be between 1 and 6' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assessment = await db.peerAssessment.create({
      data: {
        schoolId,
        assessorId,
        assessedId,
        competencyId: competencyId || null,
        classGroupId: classGroupId || null,
        assessmentType,
        level: level ?? null,
        comment: comment || null,
        rubricId: rubricId || null,
        isAnonymous: isAnonymous ?? false,
        isDemo: isDemo ?? false,
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

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('PeerAssessment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
