import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

const updateStandardSchema = z.object({
  subjectId: z.string().optional().nullable(),
  code: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  gradeLevel: z.int().min(1).max(13).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
});

export async function GET(
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
    const standard = await db.curriculumStandard.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        competencyLinks: {
          include: {
            competency: {
              select: {
                id: true,
                code: true,
                title: true,
                category: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        },
      },
    });

    if (!standard || standard.deletedAt) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    return NextResponse.json(standard);
  } catch (error) {
    console.error('Curriculum standard GET error:', error);
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
    const parsed = updateStandardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.curriculumStandard.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    const { subjectId, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (subjectId !== undefined) updateData.subjectId = subjectId ?? null;

    const updated = await db.curriculumStandard.update({
      where: { id },
      data: updateData,
      include: {
        subject: { select: { id: true, name: true } },
        competencyLinks: {
          include: {
            competency: {
              select: { id: true, code: true, title: true },
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'UPDATE',
        entityType: 'CurriculumStandard',
        entityId: id,
        metadata: JSON.stringify({ code: updated.code, title: updated.title }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Curriculum standard PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const existing = await db.curriculumStandard.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    // Soft delete
    await db.curriculumStandard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'CurriculumStandard',
        entityId: id,
        metadata: JSON.stringify({ code: existing.code, title: existing.title }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Curriculum standard DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
