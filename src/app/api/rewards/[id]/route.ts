import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/rewards/[id] — Get a single reward
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
    const reward = await db.reward.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error fetching reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rewards/[id] — Update a reward
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.reward.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, category, pointsCost, image, stock, isActive } = body;

    const reward = await db.reward.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category }),
        ...(pointsCost !== undefined && { pointsCost: parseInt(String(pointsCost), 10) }),
        ...(image !== undefined && { image: image || null }),
        ...(stock !== undefined && { stock: stock != null ? parseInt(String(stock), 10) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rewards/[id] — Soft delete a reward
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.reward.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    await db.reward.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
