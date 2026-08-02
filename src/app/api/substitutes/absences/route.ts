import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/substitutes/absences - List teacher absences
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const where: Record<string, unknown> = { schoolId };
    if (session.user?.role === 'TEACHER') where.teacherId = session.userId;

    if (teacherId && session.user?.role !== 'TEACHER') where.teacherId = teacherId;
    if (type) where.type = type;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.OR = [
        { startDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { startDate: { lte: new Date(startDate) }, endDate: { gte: new Date(endDate) } },
      ];
    } else if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    const absences = await db.teacherAbsence.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            substitute: { select: { id: true, firstName: true, lastName: true } },
            classGroup: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(absences);
  } catch (error) {
    console.error('Error fetching absences:', error);
    return NextResponse.json({ error: 'Failed to fetch absences' }, { status: 500 });
  }
}

// POST /api/substitutes/absences - Create a teacher absence
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const body = await req.json();
    const { schoolId, teacherId, type, startDate, endDate, reason, status, notes } = body;

    if (!schoolId || !teacherId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: 'schoolId, teacherId, type, startDate, and endDate are required' }, { status: 400 });
    }

    const isTeacherRequest = session.user?.role === 'TEACHER';
    if (isTeacherRequest && teacherId !== session.userId) {
      return NextResponse.json({ error: 'Teachers can only submit their own leave request' }, { status: 403 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const absence = await db.teacherAbsence.create({
      data: {
        schoolId,
        teacherId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        status: status || 'reported',
        notes: notes || null,
        approvalStatus: 'pending',
        documentUrl: body.documentUrl || null,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: true,
      },
    });

    return NextResponse.json(absence, { status: 201 });
  } catch (error) {
    console.error('Error creating absence:', error);
    return NextResponse.json({ error: 'Failed to create absence' }, { status: 500 });
  }
}
