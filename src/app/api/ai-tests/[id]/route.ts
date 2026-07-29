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
    const test = await db.aITestGeneration.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        assessment: { select: { id: true, title: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('AITests GET [id] error:', error);
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
    const { answers, isCompleted, score } = body;

    const existing = await db.aITestGeneration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }
    if (score !== undefined) {
      updateData.score = score;
    }

    const test = await db.aITestGeneration.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(test);
  } catch (error) {
    console.error('AITests PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
