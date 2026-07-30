import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get a single seating chart ──────────────────────────────────────────
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
    const chart = await db.seatingChart.findFirst({
      where: { id },
      include: {
        classGroup: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            schoolId: true,
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!chart) {
      return NextResponse.json({ error: 'Seating chart not found' }, { status: 404 });
    }

    // Access check
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== chart.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get enrolled students for the class
    const enrollments = await db.enrollment.findMany({
      where: { classGroupId: chart.classGroupId, endDate: null },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            avatarInitials: true,
          },
        },
      },
    });

    const students = enrollments.map((e) => e.student);

    // Get behavior data for smart arrange
    const behaviorIncidents = await db.behaviorIncident.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        severity: { in: ['major', 'severe'] },
      },
      select: { studentId: true, severity: true },
    });

    const behaviorMap = new Map<string, number>();
    for (const incident of behaviorIncidents) {
      const weight = incident.severity === 'severe' ? 3 : 1;
      behaviorMap.set(incident.studentId, (behaviorMap.get(incident.studentId) || 0) + weight);
    }

    return NextResponse.json({
      ...chart,
      arrangement: chart.arrangement ? JSON.parse(chart.arrangement) : [],
      students: students.map((s) => ({
        ...s,
        behaviorScore: behaviorMap.get(s.id) || 0,
      })),
    });
  } catch (error) {
    console.error('SeatingChart GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update a seating chart ──────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const chart = await db.seatingChart.findFirst({ where: { id } });

    if (!chart) {
      return NextResponse.json({ error: 'Seating chart not found' }, { status: 404 });
    }

    // Only the creator or admin can edit
    if (
      userRole === 'TEACHER' &&
      chart.teacherId !== session.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      layoutType,
      rows,
      columns,
      gap,
      arrangement,
      showDoor,
      showWindows,
      doorPosition,
      windowPosition,
      isTemplate,
      isDefault,
      notes,
    } = body;

    // If isDefault is being set to true, unset any existing default for this class
    if (isDefault) {
      await db.seatingChart.updateMany({
        where: { classGroupId: chart.classGroupId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.seatingChart.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(layoutType !== undefined && { layoutType }),
        ...(rows !== undefined && { rows }),
        ...(columns !== undefined && { columns }),
        ...(gap !== undefined && { gap }),
        ...(arrangement !== undefined && { arrangement: JSON.stringify(arrangement) }),
        ...(showDoor !== undefined && { showDoor }),
        ...(showWindows !== undefined && { showWindows }),
        ...(doorPosition !== undefined && { doorPosition }),
        ...(windowPosition !== undefined && { windowPosition }),
        ...(isTemplate !== undefined && { isTemplate }),
        ...(isDefault !== undefined && { isDefault }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Also update the ClassGroup's seatingOrder for backward compatibility
    if (arrangement && Array.isArray(arrangement)) {
      await db.classGroup.update({
        where: { id: chart.classGroupId },
        data: { seatingOrder: JSON.stringify(arrangement) },
      });
    }

    return NextResponse.json({
      ...updated,
      arrangement: updated.arrangement ? JSON.parse(updated.arrangement) : [],
    });
  } catch (error) {
    console.error('SeatingChart PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete a seating chart ──────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const chart = await db.seatingChart.findFirst({ where: { id } });

    if (!chart) {
      return NextResponse.json({ error: 'Seating chart not found' }, { status: 404 });
    }

    // Only the creator or admin can delete
    if (
      userRole === 'TEACHER' &&
      chart.teacherId !== session.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.seatingChart.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SeatingChart DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
