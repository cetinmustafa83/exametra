import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']).optional(),
  gradeLevelMin: z.number().int().optional(),
  gradeLevelMax: z.number().int().optional(),
  isGlobalTemplate: z.boolean().optional(),
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

    const { id } = await params;

    const template = await db.competencyTemplate.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        categories: {
          orderBy: { order: 'asc' },
          include: {
            competencies: {
              orderBy: { order: 'asc' },
              include: {
                masteryLevelDefinitions: { orderBy: { levelValue: 'asc' } },
              },
            },
          },
        },
        classCompetencyAssignments: {
          include: {
            classGroup: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('CompetencyTemplate GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const template = await db.competencyTemplate.update({
      where: { id },
      data: parsed.data,
      include: {
        subject: { select: { id: true, name: true } },
        categories: {
          orderBy: { order: 'asc' },
          include: {
            competencies: {
              orderBy: { order: 'asc' },
              include: {
                masteryLevelDefinitions: { orderBy: { levelValue: 'asc' } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('CompetencyTemplate PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if template is assigned to any class
    const assignments = await db.classCompetencyAssignment.findFirst({
      where: { competencyTemplateId: id },
    });

    if (assignments) {
      return NextResponse.json(
        { error: 'Template is currently assigned to a class and cannot be deleted' },
        { status: 409 }
      );
    }

    await db.competencyTemplate.delete({ where: { id } });

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('CompetencyTemplate DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
