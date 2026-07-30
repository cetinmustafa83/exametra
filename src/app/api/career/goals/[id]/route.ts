import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get single career goal ──────────────────────────────────────────
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
    const goal = await db.careerGoal.findUnique({ where: { id } });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Career goal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update career goal ─────────────────────────────────────────────
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
    const { title, description, category, targetDate, progress, status, milestones } = body;

    const existing = await db.careerGoal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (progress !== undefined) updateData.progress = progress;
    if (status !== undefined) updateData.status = status;
    if (milestones !== undefined) updateData.milestones = JSON.stringify(milestones);

    const goal = await db.careerGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Career goal PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete career goal ──────────────────────────────────────────
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
    const existing = await db.careerGoal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await db.careerGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career goal DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
