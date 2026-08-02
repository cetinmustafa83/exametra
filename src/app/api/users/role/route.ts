// @ts-nocheck
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['TEACHER', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL']),
});

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admins can change roles
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = changeRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    // Cannot change own role
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // School admins can only manage users from their own school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // School admins cannot assign SUPER_ADMIN role
    if (session.user?.role === 'SCHOOL_ADMIN' && role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot assign super admin role' },
        { status: 403 }
      );
    }

    // Cannot change role of a SUPER_ADMIN unless you are one
    if (existing.role === 'SUPER_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot change super admin role' },
        { status: 403 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'ROLE_CHANGE',
        entityType: 'User',
        entityId: userId,
        metadata: JSON.stringify({
          previousRole: existing.role,
          newRole: role,
        }),
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('User role PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// @ts-nocheck
