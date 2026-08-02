import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { isAdministrator } from '@/lib/role-access';

const createUserSchema = z.object({
  schoolId: z.string().nullable().optional(),
  email: z.string().email().min(1),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'STUDENT', 'PARENT']).default('TEACHER'),
  locale: z.string().default('de'),
  studentId: z.string().optional(), // link to Student record (for STUDENT role)
});

const bulkCreateStudentAccountsSchema = z.object({
  schoolId: z.string().min(1),
  defaultPassword: z.string().min(6).default('Schule2025!'),
  studentIds: z.array(z.string().min(1)).min(1),
  emailDomain: z.string().default('schule.de'),
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
    const roleFilter = searchParams.get('role');

    const where: Record<string, unknown> = { deletedAt: null };

    // Non-super admins can only see users from their own school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.schoolId = session.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (roleFilter) {
      where.role = roleFilter;
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
        parentLinks: {
          select: {
            id: true,
            studentId: true,
            relationship: true,
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            classGroupTeachers: true,
            learningProgressEntries: true,
            assessments: true,
            parentLinks: true,
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

    const body = await request.json();

    // ── Bulk student account creation ──
    if (body.action === 'bulkCreateStudents') {
      if (
        session.user?.role !== 'SUPER_ADMIN' &&
        session.user?.role !== 'SCHOOL_ADMIN'
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const parsed = bulkCreateStudentAccountsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { schoolId, defaultPassword, studentIds, emailDomain, locale } = parsed.data;

      // School admins can only create in their own school
      if (
        session.user?.role === 'SCHOOL_ADMIN' &&
        session.user?.schoolId &&
        schoolId !== session.user.schoolId
      ) {
        return NextResponse.json(
          { error: 'Cannot create users outside your school' },
          { status: 403 }
        );
      }

      const passwordHash = await hashPassword(defaultPassword);
      const createdUsers: Array<Record<string, unknown>> = [];

      for (const studentId of studentIds) {
        const student = await db.student.findUnique({ where: { id: studentId } });
        if (!student) continue;

        // Check if student already has a user account
        const existingUser = await db.user.findFirst({
          where: {
            role: 'STUDENT',
            schoolId,
            firstName: student.firstName,
            lastName: student.lastName,
            deletedAt: null,
          },
        });
        if (existingUser) continue; // Skip if already has account

        // Generate email based on school domain pattern
        const email = `${student.firstName.toLowerCase().replace(/\s/g, '')}.${student.lastName.toLowerCase().replace(/\s/g, '')}@${emailDomain}`;

        // Check if generated email already exists
        const emailExists = await db.user.findUnique({ where: { email } });
        if (emailExists) continue;

        const user = await db.user.create({
          data: {
            email,
            passwordHash,
            firstName: student.firstName,
            lastName: student.lastName,
            role: 'STUDENT',
            schoolId,
            locale,
          },
        });

        createdUsers.push({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          schoolId: user.schoolId,
          linkedStudentId: studentId,
        });
      }

      // Audit log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          schoolId,
          action: 'BULK_CREATE',
          entityType: 'User',
          entityId: 'bulk',
          metadata: JSON.stringify({
            count: createdUsers.length,
            role: 'STUDENT',
            schoolId,
          }),
        },
      });

      return NextResponse.json({ created: createdUsers, count: createdUsers.length }, { status: 201 });
    }

    // ── Single user creation ──
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { password, studentId, ...userData } = parsed.data;

    // Administrators can only create users in their own school.
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user?.schoolId &&
      userData.schoolId &&
      userData.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json(
        { error: 'Cannot create users outside your school' },
        { status: 403 }
      );
    }

    // School admins cannot create super admin accounts
    if (session.user?.role === 'SCHOOL_ADMIN' && userData.role === 'SUPER_ADMIN') {
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

    // If STUDENT role and studentId provided, create parent-student link
    if (userData.role === 'STUDENT' && studentId) {
      // Verify student exists
      const student = await db.student.findUnique({ where: { id: studentId } });
      if (student) {
        // No direct link between User (STUDENT) and Student - they're separate records
        // The connection is implicit: same firstName, lastName, schoolId
      }
    }

    // If PARENT role, no auto-link here; parent links are created separately

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
          linkedStudentId: studentId ?? null,
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
