import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List career goals ───────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { profileId };
    if (category) where.category = category;
    if (status) where.status = status;

    const goals = await db.careerGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Career goals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create career goal ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { profileId, title, description, category, targetDate, progress, milestones } = body;

    if (!profileId || !title || !category) {
      return NextResponse.json(
        { error: 'profileId, title, and category are required' },
        { status: 400 }
      );
    }

    const goal = await db.careerGoal.create({
      data: {
        profileId,
        title,
        description: description || null,
        category,
        targetDate: targetDate ? new Date(targetDate) : null,
        progress: progress || 0,
        milestones: milestones ? JSON.stringify(milestones) : null,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Career goals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
