import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

const createUserSchema = z.object({
  schoolId: z.string().nullable().optional(),
  email: z.string().email().min(1),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN']).default('TEACHER'),
  locale: z.string().default('de'),
});

export async function GET(request: Request) {
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
    const schoolId = searchParams.get('schoolId');

    const where: Record<string, unknown> = { deletedAt: null };

    // Non-super admins can only see users from their own school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.schoolId = session.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    const users = await db.user.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        school: { select: { id: true, name: true } },
        classGroupTeachers: {
          include: {
            classGroup: {
              select: { id: true, name: true, gradeLevel: true },
            },
          },
        },
        _count: {
          select: {
            classGroupTeachers: true,
            learningProgressEntries: true,
            assessments: true,
          },
        },
      },
    });

    // Strip password hashes before returning
    const safeUsers = users.map(({ passwordHash: _stripped, ...rest }) => rest);

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Users GET error:', error);
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
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { password, ...userData } = parsed.data;

    // School admins can only create users in their own school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      userData.schoolId &&
      userData.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json(
        { error: 'Cannot create users outside your school' },
        { status: 403 }
      );
    }

    // School admins cannot create super admin accounts
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      userData.role === 'SUPER_ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Cannot create super admin accounts' },
        { status: 403 }
      );
    }

    // Check email uniqueness
    const existingEmail = await db.user.findUnique({
      where: { email: userData.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        ...userData,
        passwordHash,
        schoolId: userData.schoolId ?? session.user?.schoolId ?? null,
      },
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: userData.schoolId ?? session.user?.schoolId ?? null,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        metadata: JSON.stringify({
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      },
    });

    // Strip password hash from response
    const { passwordHash: _stripped, ...safeUser } = user as Record<string, unknown>;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
