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
    const studentBadge = await db.studentBadge.findUnique({
      where: { id },
      include: {
        badge: true,
        student: { select: { id: true, firstName: true, lastName: true } },
        awardedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!studentBadge) return NextResponse.json({ error: 'Student badge not found' }, { status: 404 });
    return NextResponse.json(studentBadge);
  } catch (error) {
    console.error('StudentBadge GET error:', error);
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

    const existing = await db.studentBadge.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Student badge not found' }, { status: 404 });

    await db.studentBadge.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('StudentBadge DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
