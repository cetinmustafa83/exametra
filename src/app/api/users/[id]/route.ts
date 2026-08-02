import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageUser } from '@/lib/role-access';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'VICE_PRINCIPAL']).optional(),
  locale: z.string().optional(),
  schoolId: z.string().optional(),
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

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canManageUser(session.user?.role, user.role, user.id === session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // School admins can only access users from their own school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      user.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { passwordHash: _stripped, ...safeUser } = user as Record<string, unknown>;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('User GET error:', error);
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
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canManageUser(session.user?.role, existing.role, id === session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // School admins can only edit users from their own school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // School admins cannot promote to super admin
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      parsed.data.role === 'SUPER_ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Cannot assign super admin role' },
        { status: 403 }
      );
    }

    // Check email uniqueness if changed
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailTaken = await db.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      include: {
        school: { select: { id: true, name: true } },
        classGroupTeachers: {
          include: {
            classGroup: {
              select: { id: true, name: true, gradeLevel: true },
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: user.schoolId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        metadata: JSON.stringify(parsed.data),
      },
    });

    const { passwordHash: _stripped, ...safeUser } = user as Record<string, unknown>;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('User PUT error:', error);
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

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canManageUser(session.user?.role, existing.role, id === session.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // School admins can only delete users from their own school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete by setting deletedAt timestamp
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        metadata: JSON.stringify({
          email: existing.email,
          firstName: existing.firstName,
          lastName: existing.lastName,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
