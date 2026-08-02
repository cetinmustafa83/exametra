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
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = { studentId };
    if (status) where.status = status;

    const goals = await db.studentGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('StudentGoal GET error:', error);
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
    const { studentId, title, description, targetDate, progress, status } = body;

    if (!studentId || !title) {
      return NextResponse.json(
        { error: 'studentId and title are required' },
        { status: 400 }
      );
    }

    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const goal = await db.studentGoal.create({
      data: {
        studentId,
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        progress: progress || 0,
        status: status || 'active',
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('StudentGoal POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
