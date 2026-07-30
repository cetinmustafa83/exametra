import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/substitutes/absences/[id] - Get a single absence
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const absence = await db.teacherAbsence.findUnique({
      where: { id },
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
    });

    if (!absence) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }

    return NextResponse.json(absence);
  } catch (error) {
    console.error('Error fetching absence:', error);
    return NextResponse.json({ error: 'Failed to fetch absence' }, { status: 500 });
  }
}

// PUT /api/substitutes/absences/[id] - Update an absence
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.teacherAbsence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const simpleFields = ['type', 'reason', 'status', 'notes'];

    for (const field of simpleFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);

    const absence = await db.teacherAbsence.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: true,
      },
    });

    return NextResponse.json(absence);
  } catch (error) {
    console.error('Error updating absence:', error);
    return NextResponse.json({ error: 'Failed to update absence' }, { status: 500 });
  }
}

// DELETE /api/substitutes/absences/[id] - Delete an absence
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.teacherAbsence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }

    // Delete associated assignments first
    await db.substitutionAssignment.deleteMany({ where: { absenceId: id } });
    await db.teacherAbsence.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting absence:', error);
    return NextResponse.json({ error: 'Failed to delete absence' }, { status: 500 });
  }
}
