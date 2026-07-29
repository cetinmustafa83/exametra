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
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const exportCsv = searchParams.get('export') === 'csv';

    const where: Record<string, unknown> = {};

    // If not super admin, restrict to user's school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.schoolId = session.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.timestamp = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    // CSV export
    if (exportCsv) {
      const entries = await db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10000,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      const header = 'Timestamp,User,Action,Entity Type,Entity ID,Changes,IP Address,User Agent,Metadata';
      const rows = entries.map((e) => {
        const userName = e.user ? `${e.user.firstName} ${e.user.lastName}` : 'System';
        const escape = (s: string | null) => (s ? `"${s.replace(/"/g, '""')}"` : '""');
        return [
          new Date(e.timestamp).toISOString(),
          escape(userName),
          escape(e.action),
          escape(e.entityType),
          escape(e.entityId),
          escape(e.changes),
          escape(e.ipAddress),
          escape(e.userAgent),
          escape(e.metadata),
        ].join(',');
      });

      const csv = [header, ...rows].join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audit-log.csv"',
        },
      });
    }

    // Regular paginated response
    const total = await db.auditLog.count({ where });
    const entries = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      entries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('AuditLog GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
