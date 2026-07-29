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
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    const logs = await db.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const counts = {
      total: await db.emailLog.count({ where: { schoolId } }),
      sent: await db.emailLog.count({ where: { schoolId, status: 'sent' } }),
      failed: await db.emailLog.count({ where: { schoolId, status: 'failed' } }),
      pending: await db.emailLog.count({ where: { schoolId, status: 'pending' } }),
      bounced: await db.emailLog.count({ where: { schoolId, status: 'bounced' } }),
    };

    return NextResponse.json({ logs, counts });
  } catch (error) {
    console.error('EmailLogs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
