import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List seating charts with filters ──────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const classGroupId = searchParams.get('classGroupId');
    const teacherId = searchParams.get('teacherId');
    const isTemplate = searchParams.get('isTemplate');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (classGroupId) where.classGroupId = classGroupId;
    if (teacherId) where.teacherId = teacherId;
    if (isTemplate !== null && isTemplate !== undefined) {
      where.isTemplate = isTemplate === 'true';
    }

    // Role-based access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (student) {
        const enrollments = await db.enrollment.findMany({
          where: { studentId: student.id },
          select: { classGroupId: true },
        });
        const classIds = enrollments.map((e) => e.classGroupId);
        where.classGroupId = { in: classIds };
      }
    } else if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      const enrollments = await db.enrollment.findMany({
        where: { studentId: { in: studentIds } },
        select: { classGroupId: true },
      });
      const classIds = enrollments.map((e) => e.classGroupId);
      where.classGroupId = { in: classIds };
    } else if (session.user?.role === 'TEACHER') {
      // Teachers see their own charts by default, or all if classGroupId is specified
      if (!teacherId && !classGroupId) {
        where.teacherId = session.userId;
      }
    }

    const charts = await db.seatingChart.findMany({
      where,
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Parse arrangement JSON for each chart
    const result = charts.map((chart) => ({
      ...chart,
      arrangement: chart.arrangement ? JSON.parse(chart.arrangement) : [],
    }));

    return NextResponse.json({ charts: result });
  } catch (error) {
    console.error('SeatingCharts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create a seating chart ──────────────────────────────────────────
export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      name,
      classGroupId,
      schoolId,
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

    if (!name || !schoolId || !classGroupId) {
      return NextResponse.json(
        { error: 'name, schoolId, and classGroupId are required' },
        { status: 400 }
      );
    }

    // Verify class belongs to school
    const classGroup = await db.classGroup.findFirst({
      where: { id: classGroupId, schoolId, deletedAt: null },
    });
    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // If isDefault is true, unset any existing default for this class
    if (isDefault) {
      await db.seatingChart.updateMany({
        where: { classGroupId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const chart = await db.seatingChart.create({
      data: {
        schoolId,
        classGroupId,
        teacherId: session.userId,
        name,
        layoutType: layoutType || 'rows',
        rows: rows ?? 5,
        columns: columns ?? 5,
        gap: gap ?? 2,
        arrangement: arrangement ? JSON.stringify(arrangement) : null,
        showDoor: showDoor ?? true,
        showWindows: showWindows ?? true,
        doorPosition: doorPosition || 'left',
        windowPosition: windowPosition || 'right',
        isTemplate: isTemplate ?? false,
        isDefault: isDefault ?? false,
        notes: notes || null,
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Also update the ClassGroup's seatingOrder for backward compatibility
    if (arrangement && Array.isArray(arrangement)) {
      await db.classGroup.update({
        where: { id: classGroupId },
        data: { seatingOrder: JSON.stringify(arrangement) },
      });
    }

    return NextResponse.json({
      ...chart,
      arrangement: chart.arrangement ? JSON.parse(chart.arrangement) : [],
    }, { status: 201 });
  } catch (error) {
    console.error('SeatingCharts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
