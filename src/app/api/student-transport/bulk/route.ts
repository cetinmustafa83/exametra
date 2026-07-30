import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Bulk assign transport to students in a class group
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId, studentIds, transportType, routeId, pickupTime, dropoffTime, stopName } = body;

    if (!schoolId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !transportType) {
      return NextResponse.json(
        { error: 'schoolId, studentIds (array), and transportType are required' },
        { status: 400 }
      );
    }

    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'];
    if (!adminRoles.includes(session.user?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create or update transport for each student
    const results = [];
    for (const studentId of studentIds) {
      const existing = await db.studentTransport.findFirst({
        where: { schoolId, studentId, deletedAt: null },
      });

      if (existing) {
        const updated = await db.studentTransport.update({
          where: { id: existing.id },
          data: {
            transportType,
            routeId: routeId || null,
            pickupTime: pickupTime || null,
            dropoffTime: dropoffTime || null,
            stopName: stopName || null,
          },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            route: { select: { id: true, routeNumber: true, routeName: true } },
          },
        });
        results.push(updated);
      } else {
        const created = await db.studentTransport.create({
          data: {
            schoolId,
            studentId,
            transportType,
            routeId: routeId || null,
            pickupTime: pickupTime || null,
            dropoffTime: dropoffTime || null,
            stopName: stopName || null,
          },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            route: { select: { id: true, routeNumber: true, routeName: true } },
          },
        });
        results.push(created);
      }
    }

    return NextResponse.json({ count: results.length, assignments: results }, { status: 201 });
  } catch (error) {
    console.error('StudentTransport bulk POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
