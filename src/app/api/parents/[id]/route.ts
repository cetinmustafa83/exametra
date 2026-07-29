import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const relationshipEnum = z.enum(['parent', 'guardian', 'emergency']);
const preferredContactEnum = z.enum(['email', 'phone', 'both']);

const updateParentContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship: relationshipEnum.optional(),
  preferredContact: preferredContactEnum.optional(),
  preferredLanguage: z.string().optional(),
  notes: z.string().optional().nullable(),
});

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
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateParentContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.parentContact.findUnique({
      where: { id },
      include: { student: { select: { id: true, schoolId: true, deletedAt: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Parent contact not found' }, { status: 404 });
    }

    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';
    // Teachers can edit any parent contact of their school
    const isTeacherInSchool =
      session.user?.role === 'TEACHER' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;

    if (!isSchoolAdmin && !isSuperAdmin && !isTeacherInSchool) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check uniqueness when email changes
    if (parsed.data.email !== undefined && parsed.data.email) {
      const dup = await db.parentContact.findUnique({
        where: {
          studentId_email: {
            studentId: existing.studentId,
            email: parsed.data.email,
          },
        },
      });
      if (dup && dup.id !== id) {
        return NextResponse.json(
          { error: 'A contact with this email already exists for this student' },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName;
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
    if (parsed.data.relationship !== undefined) data.relationship = parsed.data.relationship;
    if (parsed.data.preferredContact !== undefined) data.preferredContact = parsed.data.preferredContact;
    if (parsed.data.preferredLanguage !== undefined) data.preferredLanguage = parsed.data.preferredLanguage;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;

    const updated = await db.parentContact.update({
      where: { id },
      data,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollments: {
              where: { endDate: null },
              select: {
                classGroup: { select: { id: true, name: true, gradeLevel: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'UPDATE',
        entityType: 'ParentContact',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('ParentContact PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.parentContact.findUnique({
      where: { id },
      include: { student: { select: { id: true, schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Parent contact not found' }, { status: 404 });
    }

    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';
    const isTeacherInSchool =
      session.user?.role === 'TEACHER' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;

    if (!isSchoolAdmin && !isSuperAdmin && !isTeacherInSchool) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cascade delete messages
    await db.parentMessage.deleteMany({ where: { parentId: id } });
    await db.parentContact.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'DELETE',
        entityType: 'ParentContact',
        entityId: id,
        metadata: JSON.stringify({
          firstName: existing.firstName,
          lastName: existing.lastName,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ParentContact DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
