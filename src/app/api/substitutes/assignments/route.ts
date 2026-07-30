import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/substitutes/assignments - List substitution assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const substituteId = searchParams.get('substituteId');
    const absenceId = searchParams.get('absenceId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classGroupId = searchParams.get('classGroupId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (substituteId) where.substituteId = substituteId;
    if (absenceId) where.absenceId = absenceId;
    if (status) where.status = status;
    if (classGroupId) where.classGroupId = classGroupId;

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where.date = { gte: new Date(startDate) };
    }

    const assignments = await db.substitutionAssignment.findMany({
      where,
      include: {
        absence: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        substitute: { select: { id: true, firstName: true, lastName: true, rating: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST /api/substitutes/assignments - Create a substitution assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId, absenceId, substituteId, classGroupId, subjectId,
      date, period, room, status, notes,
    } = body;

    if (!schoolId || !absenceId || !substituteId || !date) {
      return NextResponse.json({ error: 'schoolId, absenceId, substituteId, and date are required' }, { status: 400 });
    }

    const assignment = await db.substitutionAssignment.create({
      data: {
        schoolId,
        absenceId,
        substituteId,
        classGroupId: classGroupId || null,
        subjectId: subjectId || null,
        date: new Date(date),
        period: period || null,
        room: room || null,
        status: status || 'pending',
        notes: notes || null,
      },
      include: {
        absence: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        substitute: { select: { id: true, firstName: true, lastName: true, rating: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    // Update the substitute's totalAssignments count
    await db.substituteTeacher.update({
      where: { id: substituteId },
      data: { totalAssignments: { increment: 1 } },
    });

    // Check if all assignments for this absence are covered
    const absence = await db.teacherAbsence.findUnique({
      where: { id: absenceId },
      include: { assignments: true },
    });

    if (absence && absence.assignments.length > 0 && absence.assignments.every(a => a.status === 'confirmed' || a.status === 'completed')) {
      await db.teacherAbsence.update({
        where: { id: absenceId },
        data: { status: 'covered' },
      });
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
