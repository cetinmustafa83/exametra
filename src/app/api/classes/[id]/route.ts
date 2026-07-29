import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  gradeLevel: z.number().int().min(1).max(13).optional(),
  schoolType: z
    .enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER'])
    .optional(),
  responsibleTeacherId: z.string().nullable().optional(),
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

    const classGroup = await db.classGroup.findUnique({
      where: { id },
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

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const result = {
      ...classGroup,
      studentCount: classGroup._count.enrollments,
      assessmentCount: classGroup._count.assessments,
      teacherList: classGroup.teachers.map((t) => ({
        ...t.user,
        teacherRole: t.role,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Class GET error:', error);
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
    const parsed = updateClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.classGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // If updating responsibleTeacherId, validate the teacher exists
    if (parsed.data.responsibleTeacherId !== undefined) {
      const teacherId = parsed.data.responsibleTeacherId;
      if (teacherId) {
        const teacher = await db.user.findUnique({
          where: { id: teacherId },
          select: { id: true, role: true },
        });
        if (!teacher) {
          return NextResponse.json(
            { error: 'Teacher not found' },
            { status: 404 }
          );
        }
        if (teacher.role !== 'TEACHER' && teacher.role !== 'SCHOOL_ADMIN' && teacher.role !== 'VICE_PRINCIPAL' && teacher.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'User is not a teacher' },
            { status: 400 }
          );
        }
      }
    }

    const classGroup = await db.classGroup.update({
      where: { id },
      data: parsed.data,
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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { endDate: null },
            },
          },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: classGroup.schoolId,
        action: 'UPDATE',
        entityType: 'ClassGroup',
        entityId: id,
        metadata: JSON.stringify(parsed.data),
      },
    });

    const result = {
      ...classGroup,
      studentCount: classGroup._count.enrollments,
      teacherList: classGroup.teachers.map((t) => ({
        ...t.user,
        teacherRole: t.role,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Class PUT error:', error);
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

    const existing = await db.classGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    await db.classGroup.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'ClassGroup',
        entityId: id,
        metadata: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Class DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
