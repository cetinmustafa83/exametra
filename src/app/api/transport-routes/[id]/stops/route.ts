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
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== route.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stops = await db.transportStop.findMany({
      where: { routeId: id },
      orderBy: { stopOrder: 'asc' },
    });

    return NextResponse.json(stops);
  } catch (error) {
    console.error('TransportStop GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
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
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'];
    if (!adminRoles.includes(session.user?.role ?? '') && session.user?.schoolId !== route.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { stopName, stopOrder, pickupTime, dropoffTime, address, latitude, longitude } = body;

    if (!stopName) {
      return NextResponse.json({ error: 'stopName is required' }, { status: 400 });
    }

    // Get the current max stop order if not provided
    let order = stopOrder;
    if (order === undefined || order === null) {
      const maxStop = await db.transportStop.findFirst({
        where: { routeId: id },
        orderBy: { stopOrder: 'desc' },
        select: { stopOrder: true },
      });
      order = (maxStop?.stopOrder ?? 0) + 1;
    }

    const stop = await db.transportStop.create({
      data: {
        routeId: id,
        stopName,
        stopOrder: order,
        pickupTime: pickupTime || null,
        dropoffTime: dropoffTime || null,
        address: address || null,
        latitude: latitude != null ? latitude : null,
        longitude: longitude != null ? longitude : null,
      },
    });

    return NextResponse.json(stop, { status: 201 });
  } catch (error) {
    console.error('TransportStop POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
