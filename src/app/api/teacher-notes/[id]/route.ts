import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const noteCategoryEnum = z.enum([
  'GENERAL',
  'BEHAVIOR',
  'ACADEMIC',
  'INTERVENTION',
  'PARENT_CONTACT',
]);

const updateNoteSchema = z.object({
  category: noteCategoryEnum.optional(),
  content: z.string().min(1, 'Content cannot be empty').optional(),
  isPrivate: z.boolean().optional(),
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

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.teacherNote.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true, firstName: true, lastName: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only the author (or an admin of the school) can edit
    const isAuthor = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isAuthor && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.content !== undefined) data.content = parsed.data.content.trim();
    if (parsed.data.isPrivate !== undefined) data.isPrivate = parsed.data.isPrivate;

    const note = await db.teacherNote.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'UPDATE',
        entityType: 'TeacherNote',
        entityId: id,
        metadata: JSON.stringify({
          studentId: existing.studentId,
          studentName: `${existing.student.firstName} ${existing.student.lastName}`,
          changes: parsed.data,
        }),
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('TeacherNote PUT error:', error);
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

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.teacherNote.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true, firstName: true, lastName: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const isAuthor = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isAuthor && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.teacherNote.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'DELETE',
        entityType: 'TeacherNote',
        entityId: id,
        metadata: JSON.stringify({
          studentId: existing.studentId,
          studentName: `${existing.student.firstName} ${existing.student.lastName}`,
          category: existing.category,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TeacherNote DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
