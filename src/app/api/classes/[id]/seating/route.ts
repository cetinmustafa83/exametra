import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const classGroup = await db.classGroup.findFirst({
      where: { id, deletedAt: null },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== classGroup.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get enrolled students
    const enrollments = await db.enrollment.findMany({
      where: { classGroupId: id, endDate: null },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const students = enrollments.map((e) => e.student);

    // Parse existing seating order
    let seatingOrder: Array<{ studentId: string; row: number; col: number }> = [];
    if (classGroup.seatingOrder) {
      try {
        const parsed = JSON.parse(classGroup.seatingOrder);
        if (Array.isArray(parsed)) {
          // Check if it's the new format [{ studentId, row, col }]
          if (parsed.length > 0 && parsed[0].studentId !== undefined && parsed[0].row !== undefined) {
            seatingOrder = parsed;
          } else {
            // Legacy format: just array of student IDs, convert to grid
            seatingOrder = parsed.map((studentId: string, i: number) => ({
              studentId,
              row: Math.floor(i / 5),
              col: i % 5,
            }));
          }
        }
      } catch { /* ignore parse errors */ }
    }

    return NextResponse.json({ students, seatingOrder, classId: id });
  } catch (error) {
    console.error('Seating GET error:', error);
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
    const classGroup = await db.classGroup.findFirst({
      where: { id, deletedAt: null },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== classGroup.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { seatingOrder } = body;

    if (!Array.isArray(seatingOrder)) {
      return NextResponse.json({ error: 'seatingOrder must be an array' }, { status: 400 });
    }

    await db.classGroup.update({
      where: { id },
      data: { seatingOrder: JSON.stringify(seatingOrder) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seating PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
