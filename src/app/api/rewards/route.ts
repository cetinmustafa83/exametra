import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/rewards — List rewards for the user's school
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const schoolId = session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    const rewards = await db.reward.findMany({
      where,
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rewards — Create a new reward
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const schoolId = session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, category, pointsCost, image, stock, isActive, isDemo } = body;

    if (!title || !category || !pointsCost) {
      return NextResponse.json({ error: 'Title, category, and pointsCost are required' }, { status: 400 });
    }

    const validCategories = ['streaming', 'shopping', 'experience', 'merchandise', 'privilege'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const reward = await db.reward.create({
      data: {
        schoolId,
        title,
        description: description || null,
        category,
        pointsCost: parseInt(String(pointsCost), 10),
        image: image || null,
        stock: stock != null ? parseInt(String(stock), 10) : null,
        isActive: isActive !== false,
        isDemo: isDemo === true,
      },
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
