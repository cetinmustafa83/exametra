import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/substitutes/assignments/[id] - Get a single assignment
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignment = await db.substitutionAssignment.findUnique({
      where: { id },
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

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
  }
}

// PUT /api/substitutes/assignments/[id] - Update an assignment
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.substitutionAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const simpleFields = ['status', 'notes', 'room', 'period', 'substituteId', 'classGroupId', 'subjectId'];

    for (const field of simpleFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.date) data.date = new Date(body.date);

    const assignment = await db.substitutionAssignment.update({
      where: { id },
      data,
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

    // Check if all assignments for this absence are covered
    if (body.status === 'confirmed' || body.status === 'completed') {
      const absence = await db.teacherAbsence.findUnique({
        where: { id: existing.absenceId },
        include: { assignments: true },
      });

      if (absence && absence.assignments.every(a => a.status === 'confirmed' || a.status === 'completed')) {
        await db.teacherAbsence.update({
          where: { id: existing.absenceId },
          data: { status: 'covered' },
        });
      }
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

// DELETE /api/substitutes/assignments/[id] - Delete an assignment
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.substitutionAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Decrement the substitute's totalAssignments count
    await db.substituteTeacher.update({
      where: { id: existing.substituteId },
      data: { totalAssignments: { decrement: 1 } },
    });

    await db.substitutionAssignment.delete({ where: { id } });

    // Check if the absence is still covered
    const absence = await db.teacherAbsence.findUnique({
      where: { id: existing.absenceId },
      include: { assignments: true },
    });

    if (absence && absence.assignments.length > 0 && !absence.assignments.every(a => a.status === 'confirmed' || a.status === 'completed')) {
      await db.teacherAbsence.update({
        where: { id: existing.absenceId },
        data: { status: 'reported' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
