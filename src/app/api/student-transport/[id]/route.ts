import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';

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
    const transport = await db.studentTransport.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        route: {
          select: { id: true, routeNumber: true, routeName: true, transportType: true },
        },
      },
    });

    if (!transport) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== transport.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, transport.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(transport);
  } catch (error) {
    console.error('StudentTransport GET [id] error:', error);
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
    const existing = await db.studentTransport.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      transportType,
      routeNumber,
      stopName,
      pickupTime,
      dropoffTime,
      driverName,
      driverPhone,
      distanceKm,
      routeId,
      notes,
    } = body;

    const updated = await db.studentTransport.update({
      where: { id },
      data: {
        ...(transportType !== undefined && { transportType }),
        ...(routeNumber !== undefined && { routeNumber: routeNumber || null }),
        ...(stopName !== undefined && { stopName: stopName || null }),
        ...(pickupTime !== undefined && { pickupTime: pickupTime || null }),
        ...(dropoffTime !== undefined && { dropoffTime: dropoffTime || null }),
        ...(driverName !== undefined && { driverName: driverName || null }),
        ...(driverPhone !== undefined && { driverPhone: driverPhone || null }),
        ...(distanceKm !== undefined && { distanceKm: distanceKm != null ? distanceKm : null }),
        ...(routeId !== undefined && { routeId: routeId || null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        route: {
          select: { id: true, routeNumber: true, routeName: true, transportType: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('StudentTransport PUT [id] error:', error);
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
    const existing = await db.studentTransport.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.studentTransport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('StudentTransport DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
