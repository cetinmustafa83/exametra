import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/demo-accounts — List all demo users
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const demoUsers = await db.user.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isDemo: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(demoUsers);
  } catch (error) {
    console.error('Demo accounts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/demo-accounts — Toggle all demo accounts (enable/disable)
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // 'enable' or 'disable'

    if (action === 'disable') {
      await db.user.updateMany({
        where: { isDemo: true, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } else if (action === 'enable') {
      await db.user.updateMany({
        where: { isDemo: true, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "enable" or "disable"' }, { status: 400 });
    }

    const demoUsers = await db.user.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isDemo: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, accounts: demoUsers });
  } catch (error) {
    console.error('Demo accounts PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/demo-accounts — Permanently delete all demo users
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await db.user.deleteMany({
      where: { isDemo: true },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Demo accounts DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
