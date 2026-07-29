import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT /api/demo-accounts/[id] — Toggle a single demo user's active status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'enable' or 'disable'

    const user = await db.user.findUnique({ where: { id } });
    if (!user || !user.isDemo) {
      return NextResponse.json({ error: 'Demo account not found' }, { status: 404 });
    }

    if (action === 'disable') {
      await db.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else if (action === 'enable') {
      await db.user.update({
        where: { id },
        data: { deletedAt: null },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "enable" or "disable"' }, { status: 400 });
    }

    const updated = await db.user.findUnique({
      where: { id },
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
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error) {
    console.error('Demo account PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/demo-accounts/[id] — Permanently delete a single demo user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user || !user.isDemo) {
      return NextResponse.json({ error: 'Demo account not found' }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Demo account DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
