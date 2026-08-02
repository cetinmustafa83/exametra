import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

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
    const status = searchParams.get('status');

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

    if (studentId && (!session.user || !(await canAccessStudent(session.user, studentId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentId) where.studentId = studentId;
    if (!studentId && session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({ where: { userId: session.user.id }, select: { id: true } });
      if (!student) return NextResponse.json([]);
      where.studentId = student.id;
    } else if (!studentId && session.user?.role === 'PARENT') {
      const links = await db.parentStudentLink.findMany({ where: { parentId: session.user.id }, select: { studentId: true } });
      where.studentId = { in: links.map((link) => link.studentId) };
    }
    if (competencyId) where.competencyId = competencyId;
    if (status) where.status = status;

    const goals = await db.learningGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
        selfAssessments: {
          where: { deletedAt: null },
          select: { id: true, selfLevel: true, confidence: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('LearningGoal GET error:', error);
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
      title,
      description,
      targetLevel,
      currentLevel,
      deadline,
      status,
      progress,
      isDemo,
    } = body;

    if (!schoolId || !studentId || !title) {
      return NextResponse.json(
        { error: 'schoolId, studentId, and title are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const goal = await db.learningGoal.create({
      data: {
        schoolId,
        studentId,
        competencyId: competencyId || null,
        title,
        description: description || null,
        targetLevel: targetLevel || null,
        currentLevel: currentLevel || null,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'active',
        progress: progress || 0,
        isDemo: isDemo ?? false,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('LearningGoal POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
