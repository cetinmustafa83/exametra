import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/substitutes/[id] - Get a single substitute teacher
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const substitute = await db.substituteTeacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            absence: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
            classGroup: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!substitute || substitute.deletedAt) {
      return NextResponse.json({ error: 'Substitute not found' }, { status: 404 });
    }

    return NextResponse.json(substitute);
  } catch (error) {
    console.error('Error fetching substitute:', error);
    return NextResponse.json({ error: 'Failed to fetch substitute' }, { status: 500 });
  }
}

// PUT /api/substitutes/[id] - Update a substitute teacher
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.substituteTeacher.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Substitute not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const jsonFields = ['qualifications', 'subjects', 'gradeLevels', 'availability'];
    const simpleFields = ['firstName', 'lastName', 'email', 'phone', 'maxDaysPerWeek', 'notes', 'isActive', 'rating', 'totalAssignments'];

    for (const field of simpleFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        data[field] = body[field] ? JSON.stringify(body[field]) : null;
      }
    }

    const substitute = await db.substituteTeacher.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(substitute);
  } catch (error) {
    console.error('Error updating substitute:', error);
    return NextResponse.json({ error: 'Failed to update substitute' }, { status: 500 });
  }
}

// DELETE /api/substitutes/[id] - Soft delete a substitute teacher
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.substituteTeacher.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Substitute not found' }, { status: 404 });
    }

    const substitute = await db.substituteTeacher.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json(substitute);
  } catch (error) {
    console.error('Error deleting substitute:', error);
    return NextResponse.json({ error: 'Failed to delete substitute' }, { status: 500 });
  }
}
