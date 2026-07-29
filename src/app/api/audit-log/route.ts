import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    // If not super admin, restrict to user's school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.schoolId = session.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (action) where.action = action;

    if (startDate || endDate) {
      where.timestamp = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const entries = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 200,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('AuditLog GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
