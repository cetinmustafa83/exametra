import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass, canAccessStudent } from '@/lib/access-policy';

const submitSchema = z.object({
  content: z.string().max(10000).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  status: z.enum(['submitted', 'late']).optional().default('submitted'),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const homework = await db.homework.findUnique({ where: { id, deletedAt: null }, select: { classGroupId: true } });
    if (!homework || !session.user || !(await canAccessClass(session.user, homework.classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const where: Record<string, unknown> = { homeworkId: id, deletedAt: null };
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({ where: { userId: session.user.id }, select: { id: true } });
      if (!student) return NextResponse.json([]);
      where.studentId = student.id;
    } else if (session.user.role === 'PARENT') {
      const links = await db.parentStudentLink.findMany({ where: { parentId: session.user.id }, select: { studentId: true } });
      where.studentId = { in: links.map((link) => link.studentId) };
    }
    if (status && status !== 'all') where.status = status;

    const submissions = await db.homeworkSubmission.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        homework: { select: { id: true, title: true, maxPoints: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('HomeworkSubmissions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify homework exists and is published
    const homework = await db.homework.findUnique({
      where: { id, deletedAt: null },
    });
    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // For students, we need to find the student record
    let studentId: string | undefined;
    if (session.user?.role === 'STUDENT') {
      // Student users need to find their student record via enrollment
      const student = await db.student.findFirst({
        where: {
          userId: session.user.id,
          schoolId: homework.schoolId,
          deletedAt: null,
          enrollments: {
            some: { classGroupId: homework.classGroupId },
          },
        },
      });
      if (!student) {
        return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 });
      }
      studentId = student.id;
    } else if (isTeacherOrAdmin(session.user?.role)) {
      // Teachers can submit on behalf of a student
      studentId = body.studentId;
      if (!studentId) {
        return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
      }
      if (!session.user || !(await canAccessStudent(session.user, studentId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Cannot determine student' }, { status: 400 });
    }

    // Check for existing submission
    const existing = await db.homeworkSubmission.findUnique({
      where: { homeworkId_studentId: { homeworkId: id, studentId } },
    });

    if (existing && existing.deletedAt === null) {
      // Update existing submission
      const isLate = new Date() > homework.dueDate;
      const submission = await db.homeworkSubmission.update({
        where: { id: existing.id },
        data: {
          content: parsed.data.content ?? null,
          attachments: parsed.data.attachments ? JSON.stringify(parsed.data.attachments) : null,
          status: isLate ? 'late' : (parsed.data.status ?? 'submitted'),
          submittedAt: new Date(),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(submission);
    }

    // If there's a soft-deleted submission, restore it
    if (existing && existing.deletedAt !== null) {
      const isLate = new Date() > homework.dueDate;
      const submission = await db.homeworkSubmission.update({
        where: { id: existing.id },
        data: {
          content: parsed.data.content ?? null,
          attachments: parsed.data.attachments ? JSON.stringify(parsed.data.attachments) : null,
          status: isLate ? 'late' : (parsed.data.status ?? 'submitted'),
          submittedAt: new Date(),
          deletedAt: null,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(submission);
    }

    // Create new submission
    const isLate = new Date() > homework.dueDate;
    const submission = await db.homeworkSubmission.create({
      data: {
        homeworkId: id,
        studentId,
        content: parsed.data.content ?? null,
        attachments: parsed.data.attachments ? JSON.stringify(parsed.data.attachments) : null,
        status: isLate ? 'late' : (parsed.data.status ?? 'submitted'),
        submittedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('HomeworkSubmission POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
