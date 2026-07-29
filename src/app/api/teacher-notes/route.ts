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

const createNoteSchema = z.object({
  studentId: z.string().min(1),
  category: noteCategoryEnum,
  content: z.string().min(1, 'Content cannot be empty'),
  isPrivate: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only teachers + admins may view private notes
    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    // Verify the student belongs to a school the user can see
    const student = await db.student.findUnique({
      where: { id: studentId, deletedAt: null },
      select: { id: true, schoolId: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notes = await db.teacherNote.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('TeacherNotes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { studentId, category, content, isPrivate = true } = parsed.data;

    // Verify student exists and is in scope
    const student = await db.student.findUnique({
      where: { id: studentId, deletedAt: null },
      select: { id: true, schoolId: true, firstName: true, lastName: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const note = await db.teacherNote.create({
      data: {
        studentId,
        teacherId: session.userId,
        category,
        content: content.trim(),
        isPrivate,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: student.schoolId,
        action: 'CREATE',
        entityType: 'TeacherNote',
        entityId: note.id,
        metadata: JSON.stringify({
          studentId,
          category,
          studentName: `${student.firstName} ${student.lastName}`,
        }),
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('TeacherNotes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
