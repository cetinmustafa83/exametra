import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

const levelSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  points: z.int().min(0),
  order: z.int().min(0).default(0),
});

const criterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  weight: z.number().min(0).default(1.0),
  maxPoints: z.int().min(1),
  order: z.int().min(0).default(0),
  levels: z.array(levelSchema).min(1),
});

const updateRubricSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(['ANALYTIC', 'HOLISTIC']).optional(),
  subjectId: z.string().optional().nullable(),
  maxPoints: z.int().min(1).optional(),
  isPublic: z.boolean().optional(),
  criteria: z.array(criterionSchema).min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const rubric = await db.rubric.findUnique({
      where: { id },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!rubric) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      rubric.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(rubric);
  } catch (error) {
    console.error('Rubric GET error:', error);
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
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateRubricSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.rubric.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only the owner or admin can update
    if (existing.teacherId !== session.userId && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only the owner can edit this rubric' }, { status: 403 });
    }

    const { criteria, subjectId, ...rest } = parsed.data;

    // Update scalar fields
    const updateData: Record<string, unknown> = {};
    if (rest.title !== undefined) updateData.title = rest.title;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.type !== undefined) updateData.type = rest.type;
    if (rest.maxPoints !== undefined) updateData.maxPoints = rest.maxPoints;
    if (rest.isPublic !== undefined) updateData.isPublic = rest.isPublic;
    if (subjectId !== undefined) updateData.subjectId = subjectId ?? null;

    // Handle nested criteria update
    if (criteria) {
      // Delete existing criteria (cascade will delete levels)
      await db.rubricCriterion.deleteMany({ where: { rubricId: id } });

      // Create new criteria with levels
      updateData.criteria = {
        create: criteria.map((c, ci) => ({
          name: c.name,
          description: c.description ?? null,
          weight: c.weight,
          maxPoints: c.maxPoints,
          order: c.order ?? ci,
          levels: {
            create: c.levels.map((l, li) => ({
              label: l.label,
              description: l.description,
              points: l.points,
              order: l.order ?? li,
            })),
          },
        })),
      };
    }

    const updated = await db.rubric.update({
      where: { id },
      data: updateData,
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'UPDATE',
        entityType: 'Rubric',
        entityId: id,
        metadata: JSON.stringify({ title: updated.title, updatedFields: Object.keys(rest) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Rubric PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.rubric.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only the owner or admin can delete
    if (existing.teacherId !== session.userId && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only the owner can delete this rubric' }, { status: 403 });
    }

    // Cascade will delete criteria and levels
    await db.rubric.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'Rubric',
        entityId: id,
        metadata: JSON.stringify({ title: existing.title, type: existing.type }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rubric DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
