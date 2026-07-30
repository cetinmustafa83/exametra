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
    const status = searchParams.get('status');
    const teacherId = searchParams.get('teacherId');
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

    if (status) where.status = status;
    if (teacherId) where.teacherId = teacherId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (assessmentType) where.assessmentType = assessmentType;

    // For students, only show sessions where they are involved
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id, deletedAt: null },
      });
      if (student) {
        where.assignedPairs = { contains: student.id };
      }
    }

    const sessions = await db.peerAssessmentSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        _count: {
          select: { peerAssessments: true },
        },
      },
    });

    // Enrich with completion stats
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const total = await db.peerAssessment.count({
          where: { sessionId: s.id, deletedAt: null },
        });
        const submitted = await db.peerAssessment.count({
          where: { sessionId: s.id, status: 'submitted', deletedAt: null },
        });
        return {
          ...s,
          stats: { total, submitted, pending: total - submitted },
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('PeerAssessmentSession GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only teachers and admins can create sessions
    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL'
    ) {
      return NextResponse.json({ error: 'Only teachers and admins can create assessments' }, { status: 403 });
    }

    const body = await request.json();
    const {
      schoolId,
      teacherId,
      classGroupId,
      title,
      description,
      assessmentType,
      criteria,
      anonymityMode,
      deadline,
      assignMode,
      assignedPairs,
      isDemo,
    } = body;

    if (!schoolId || !title || !assessmentType) {
      return NextResponse.json(
        { error: 'schoolId, title, and assessmentType are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assessmentSession = await db.peerAssessmentSession.create({
      data: {
        schoolId,
        teacherId: teacherId || session.user.id,
        classGroupId: classGroupId || null,
        title,
        description: description || null,
        assessmentType,
        criteria: criteria ? JSON.stringify(criteria) : null,
        anonymityMode: anonymityMode || 'anonymous',
        status: 'active',
        deadline: deadline ? new Date(deadline) : null,
        assignMode: assignMode || 'manual',
        assignedPairs: assignedPairs ? JSON.stringify(assignedPairs) : null,
        isDemo: isDemo ?? false,
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

    // If assignedPairs provided, create individual PeerAssessment records
    if (assignedPairs && Array.isArray(assignedPairs) && assignedPairs.length > 0) {
      const criteriaForRatings = criteria ? JSON.parse(JSON.stringify(criteria)) : null;
      const assessmentRecords = assignedPairs.map(
        (pair: { assessorId: string; assessedId: string }) => ({
          schoolId,
          sessionId: assessmentSession.id,
          assessorId: pair.assessorId,
          assessedId: pair.assessedId,
          classGroupId: classGroupId || null,
          assessmentType,
          criteria: criteriaForRatings
            ? JSON.stringify(criteriaForRatings.map((c: { name: string; maxScore: number }) => ({ name: c.name, score: 0, maxScore: c.maxScore })))
            : null,
          isAnonymous: anonymityMode === 'anonymous' || anonymityMode === 'semi-anonymous',
          status: 'pending',
          isDemo: isDemo ?? false,
        })
      );

      await db.peerAssessment.createMany({ data: assessmentRecords });
    }

    return NextResponse.json(assessmentSession, { status: 201 });
  } catch (error) {
    console.error('PeerAssessmentSession POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
