import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const badge = await db.badge.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { studentBadges: true } },
      },
    });

    if (!badge) return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    return NextResponse.json(badge);
  } catch (error) {
    console.error('Badge GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const existing = await db.badge.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Badge not found' }, { status: 404 });

    const updated = await db.badge.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        icon: body.icon ?? existing.icon,
        color: body.color ?? existing.color,
        category: body.category ?? existing.category,
        requirementType: body.requirementType ?? existing.requirementType,
        requirementValue: body.requirementValue ?? existing.requirementValue,
        isAuto: body.isAuto ?? existing.isAuto,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Badge PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const existing = await db.badge.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Badge not found' }, { status: 404 });

    // Soft delete
    await db.badge.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Badge DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
