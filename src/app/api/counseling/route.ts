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
    const schoolIdParam = searchParams.get('schoolId');
    const status = searchParams.get('status');

    const role = session.user?.role;
    const userId = session.userId;

    let schoolId: string | undefined;
    if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      schoolId = session.user?.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    // Role-based filtering
    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (role === 'TEACHER') {
      // Teachers see their own counseling appointments (as counselor)
      where.counselorId = userId;
    }
    // ADMIN, VICE_PRINCIPAL, SUPER_ADMIN see all

    const appointments = await db.counselingAppointment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Counseling GET error:', error);
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
    const { requestType, description, addToCalendar, isPrivate } = body;
    const schoolId = body.schoolId || session.user?.schoolId;
    const role = session.user?.role;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }
    if (role !== 'SUPER_ADMIN' && schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only students can request counseling.
    if (role !== 'STUDENT' && role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'STUDENT') {
      const student = await db.student.findFirst({ where: { userId: session.userId, schoolId, deletedAt: null }, select: { id: true } });
      if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 403 });
    }

    // Find a counselor teacher for this school
    const counselor = await db.user.findFirst({
      where: {
        schoolId,
        role: 'TEACHER',
        counselingAppointments: { some: {} },
      },
      select: { id: true },
    });

    // If no counselor found via existing appointments, look for any teacher assigned
    let counselorId = counselor?.id;
    if (!counselorId) {
      // Check if there's an AISettings with a counselor assigned
      const aiSettings = await db.aISettings.findFirst({
        where: { schoolId },
      });
      if (aiSettings) {
        // Use a generic approach - find any teacher in the school
        const anyTeacher = await db.user.findFirst({
          where: { schoolId, role: 'TEACHER' },
          select: { id: true },
        });
        counselorId = anyTeacher?.id;
      }
    }

    if (!counselorId) {
      const anyTeacher = await db.user.findFirst({
        where: { schoolId, role: 'TEACHER' },
        select: { id: true },
      });
      counselorId = anyTeacher?.id;
    }

    if (!counselorId) {
      return NextResponse.json({ error: 'No counselor available' }, { status: 400 });
    }

    const appointment = await db.counselingAppointment.create({
      data: {
        schoolId,
        studentId: session.userId,
        counselorId,
        requestType: requestType || 'guidance',
        description: description || null,
        status: 'requested',
        addToCalendar: addToCalendar ?? true,
        isPrivate: isPrivate ?? true,
      },
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Counseling POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
