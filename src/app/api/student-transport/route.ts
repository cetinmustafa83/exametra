import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role)) {
      return NextResponse.json({ error: 'Student transport is restricted to administrators' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (studentId && (!session.user || !(await canAccessStudent(session.user, studentId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentId) where.studentId = studentId;

    const transports = await db.studentTransport.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        route: {
          select: { id: true, routeNumber: true, routeName: true, transportType: true },
        },
      },
    });

    return NextResponse.json(transports);
  } catch (error) {
    console.error('StudentTransport GET error:', error);
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
      studentId,
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
      isDemo,
    } = body;

    if (!schoolId || !studentId || !transportType) {
      return NextResponse.json(
        { error: 'schoolId, studentId, and transportType are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transport = await db.studentTransport.create({
      data: {
        schoolId,
        studentId,
        transportType,
        routeNumber: routeNumber || null,
        stopName: stopName || null,
        pickupTime: pickupTime || null,
        dropoffTime: dropoffTime || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        distanceKm: distanceKm != null ? distanceKm : null,
        routeId: routeId || null,
        notes: notes || null,
        isDemo: isDemo ?? false,
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

    return NextResponse.json(transport, { status: 201 });
  } catch (error) {
    console.error('StudentTransport POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
