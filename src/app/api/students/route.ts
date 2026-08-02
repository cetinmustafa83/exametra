import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent, getTeacherClassIds } from '@/lib/access-policy';
import { canManageStudent, isAdministrator } from '@/lib/role-access';

const createStudentSchema = z.object({
  schoolId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  externalId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classGroupId = searchParams.get('classGroupId');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');

    const user = session.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const where: Record<string, unknown> = { deletedAt: null };

    if (schoolId) where.schoolId = schoolId;

    if (!isAdministrator(user.role)) {
      if (user.role === 'TEACHER') {
        const classIds = await getTeacherClassIds(user.id);
        where.enrollments = { some: { classGroupId: { in: classIds }, endDate: null } };
      } else if (user.role === 'STUDENT') {
        where.userId = user.id;
      } else if (user.role === 'PARENT') {
        where.parentStudentLinks = { some: { parentId: user.id } };
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Filter by userId (direct link to User account)
    let userIdFilter: Record<string, unknown>[] | null = null;
    if (userId) {
      // For STUDENT role, also match by name + school as fallback for legacy data
      if (session.user?.role === 'STUDENT' && session.user.id === userId) {
        const legacyStudentFilter: Record<string, unknown> = {
          userId: null,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          schoolId: session.user.schoolId,
        };
        userIdFilter = [{ userId }, legacyStudentFilter];
      } else {
        where.userId = userId;
      }
    }

    if (classGroupId) {
      where.enrollments = {
        some: { classGroupId, endDate: null },
      };
    }

    if (search) {
      const searchOr = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { externalId: { contains: search } },
      ];
      // If userId filter also uses OR, combine with AND
      if (userIdFilter) {
        where.AND = [
          { OR: userIdFilter },
          { OR: searchOr },
        ];
      } else {
        where.OR = searchOr;
      }
    } else if (userIdFilter) {
      where.OR = userIdFilter;
    }

    const students = await db.student.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        school: { select: { id: true, name: true } },
        enrollments: {
          where: { endDate: null },
          include: {
            classGroup: {
              select: { id: true, name: true, gradeLevel: true },
            },
          },
        },
        _count: {
          select: {
            learningProgressEntries: true,
            assessmentResults: true,
          },
        },
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Students GET error:', error);
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

    if (!canManageStudent(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (
      session.user?.role === 'TEACHER' &&
      (!session.user.schoolId || parsed.data.schoolId !== session.user.schoolId)
    ) {
      return NextResponse.json({ error: 'Teachers can only create students in their own school' }, { status: 403 });
    }

    const student = await db.student.create({
      data: parsed.data,
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Students POST error:', error);
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

    if (!canManageStudent(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateSchema = z.object({
      id: z.string().min(1),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      dateOfBirth: z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
      externalId: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    if (!session.user || !(await canAccessStudent(session.user, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const student = await db.student.update({
      where: { id },
      data: updateData,
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Students PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
