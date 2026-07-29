import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createClassSchema = z.object({
  schoolId: z.string().min(1),
  schoolYearId: z.string().min(1),
  name: z.string().min(1),
  gradeLevel: z.number().int().min(1).max(13),
  schoolType: z
    .enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER'])
    .default('ELEMENTARY'),
  teacherIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const schoolYearId = searchParams.get('schoolYearId');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    // If teacher role, only show their assigned classes
    if (session.user?.role === 'TEACHER' && session.userId) {
      where.teachers = { some: { userId: session.userId } };
    }

    const classes = await db.classGroup.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        school: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        responsibleTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        teachers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { endDate: null },
            },
            assessments: true,
          },
        },
      },
    });

    const result = classes.map((cls) => ({
      ...cls,
      studentCount: cls._count.enrollments,
      assessmentCount: cls._count.assessments,
      teacherList: cls.teachers.map((t) => ({
        ...t.user,
        teacherRole: t.role,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Classes GET error:', error);
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
    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherIds, ...classData } = parsed.data;

    const classGroup = await db.classGroup.create({
      data: {
        ...classData,
        teachers: teacherIds
          ? {
              create: teacherIds.map((userId) => ({
                userId,
                role: 'SUBJECT_TEACHER' as const,
              })),
            }
          : undefined,
      },
      include: {
        school: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        teachers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(classGroup, { status: 201 });
  } catch (error) {
    console.error('Classes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const updateSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      gradeLevel: z.number().int().min(1).max(13).optional(),
      schoolType: z
        .enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER'])
        .optional(),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const classGroup = await db.classGroup.update({
      where: { id },
      data: updateData,
      include: {
        school: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        teachers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(classGroup);
  } catch (error) {
    console.error('Classes PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
