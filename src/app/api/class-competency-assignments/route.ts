import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createAssignmentSchema = z.object({
  classGroupId: z.string().min(1),
  subjectId: z.string().min(1),
  competencyTemplateId: z.string().min(1),
  schoolYearId: z.string().min(1),
  clonedTemplateId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');
    const schoolYearId = searchParams.get('schoolYearId');

    const where: Record<string, unknown> = {};
    if (classGroupId) where.classGroupId = classGroupId;
    if (subjectId) where.subjectId = subjectId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const assignments = await db.classCompetencyAssignment.findMany({
      where,
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        competencyTemplate: {
          select: {
            id: true,
            name: true,
            schoolType: true,
            gradeLevelMin: true,
            gradeLevelMax: true,
          },
        },
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('ClassCompetencyAssignments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check uniqueness constraint (classGroupId + subjectId + schoolYearId)
    const existing = await db.classCompetencyAssignment.findFirst({
      where: {
        classGroupId: parsed.data.classGroupId,
        subjectId: parsed.data.subjectId,
        schoolYearId: parsed.data.schoolYearId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A competency template is already assigned for this class/subject/year combination' },
        { status: 409 }
      );
    }

    const assignment = await db.classCompetencyAssignment.create({
      data: parsed.data,
      include: {
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        competencyTemplate: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('ClassCompetencyAssignments POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    await db.classCompetencyAssignment.delete({ where: { id } });

    return NextResponse.json({ message: 'Assignment deleted' });
  } catch (error) {
    console.error('ClassCompetencyAssignments DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
