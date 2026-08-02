import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass, canAccessStudent } from '@/lib/access-policy';

const gradeSchema = z.object({
  score: z.number().min(0).optional().nullable(),
  feedback: z.string().max(5000).optional().nullable(),
  status: z.enum(['graded', 'submitted', 'late', 'pending']).optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: homeworkId, submissionId } = await params;

    const body = await request.json();
    const parsed = gradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.homeworkSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    const homework = await db.homework.findUnique({ where: { id: homeworkId }, select: { classGroupId: true } });
    if (!homework || !session.user || !(await canAccessClass(session.user, homework.classGroupId)) || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.score !== undefined) {
      updateData.score = parsed.data.score;
      updateData.gradedAt = new Date();
      if (!parsed.data.status) updateData.status = 'graded';
    }
    if (parsed.data.feedback !== undefined) updateData.feedback = parsed.data.feedback;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const submission = await db.homeworkSubmission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        homework: { select: { id: true, title: true, maxPoints: true } },
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error('HomeworkSubmission PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: homeworkId, submissionId } = await params;
    const existing = await db.homeworkSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    const homework = await db.homework.findUnique({ where: { id: homeworkId }, select: { classGroupId: true } });
    if (!homework || !session.user || !(await canAccessClass(session.user, homework.classGroupId)) || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.homeworkSubmission.update({
      where: { id: submissionId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HomeworkSubmission DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
