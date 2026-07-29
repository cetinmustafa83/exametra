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
    const studentId = searchParams.get('studentId');
    const competencyId = searchParams.get('competencyId');
    const classGroupId = searchParams.get('classGroupId');

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

    if (studentId) where.studentId = studentId;
    if (competencyId) where.competencyId = competencyId;
    if (classGroupId) where.classGroupId = classGroupId;

    const assessments = await db.selfAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        goal: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('SelfAssessment GET error:', error);
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
      studentId,
      competencyId,
      classGroupId,
      selfLevel,
      confidence,
      reflection,
      evidence,
      goalId,
      isDemo,
    } = body;

    if (!schoolId || !studentId || !competencyId || selfLevel === undefined) {
      return NextResponse.json(
        { error: 'schoolId, studentId, competencyId, and selfLevel are required' },
        { status: 400 }
      );
    }

    if (selfLevel < 1 || selfLevel > 6) {
      return NextResponse.json(
        { error: 'selfLevel must be between 1 and 6' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assessment = await db.selfAssessment.create({
      data: {
        schoolId,
        studentId,
        competencyId,
        classGroupId: classGroupId || null,
        selfLevel,
        confidence: confidence || null,
        reflection: reflection || null,
        evidence: evidence || null,
        goalId: goalId || null,
        isDemo: isDemo ?? false,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
        goal: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('SelfAssessment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
