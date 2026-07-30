import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
    const route = await db.transportRoute.findFirst({
      where: { id, deletedAt: null },
      include: {
        stops: { orderBy: { stopOrder: 'asc' } },
        assignments: {
          where: { deletedAt: null },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { assignments: { where: { deletedAt: null } } },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== route.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('TransportRoute GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.transportRoute.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'];
    if (!adminRoles.includes(session.user?.role ?? '') && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      routeNumber,
      routeName,
      transportType,
      driverName,
      driverPhone,
      capacity,
      isActive,
      notes,
    } = body;

    const updated = await db.transportRoute.update({
      where: { id },
      data: {
        ...(routeNumber !== undefined && { routeNumber }),
        ...(routeName !== undefined && { routeName }),
        ...(transportType !== undefined && { transportType }),
        ...(driverName !== undefined && { driverName: driverName || null }),
        ...(driverPhone !== undefined && { driverPhone: driverPhone || null }),
        ...(capacity !== undefined && { capacity }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: { select: { assignments: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('TransportRoute PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.transportRoute.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'];
    if (!adminRoles.includes(session.user?.role ?? '') && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.transportRoute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TransportRoute DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
