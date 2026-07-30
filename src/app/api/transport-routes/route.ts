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
    const isActive = searchParams.get('isActive');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const routes = await db.transportRoute.findMany({
      where,
      orderBy: [{ routeNumber: 'asc' }],
      include: {
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
        _count: {
          select: { assignments: { where: { deletedAt: null } } },
        },
      },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('TransportRoute GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      routeNumber,
      routeName,
      transportType,
      driverName,
      driverPhone,
      capacity,
      isActive,
      notes,
    } = body;

    if (!schoolId || !routeNumber || !routeName || !transportType) {
      return NextResponse.json(
        { error: 'schoolId, routeNumber, routeName, and transportType are required' },
        { status: 400 }
      );
    }

    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'];
    if (!adminRoles.includes(session.user?.role ?? '') && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const route = await db.transportRoute.create({
      data: {
        schoolId,
        routeNumber,
        routeName,
        transportType,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        capacity: capacity ?? 40,
        isActive: isActive ?? true,
        notes: notes || null,
      },
      include: {
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: { select: { assignments: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error('TransportRoute POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
