import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get a single lesson question ──
async function getQuestion(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const question = await db.lessonQuestion.findUnique({
      where: { id },
      include: {
        lesson: {
          select: { id: true, topic: { select: { schoolId: true } } },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Access check: same school
    if (question.lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For students: hide correct answer and explanation
    if (session.user.role === 'STUDENT') {
      const sanitized = {
        ...question,
        correctAnswer: '',
        explanation: null,
      };
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('LessonQuestion get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a lesson question ──
const updateQuestionSchema = z.object({
  questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching']).optional(),
  question: z.string().min(1).optional(),
  options: z.string().optional().nullable(),
  correctAnswer: z.string().min(1).optional(),
  explanation: z.string().optional().nullable(),
  points: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

async function updateQuestion(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'TEACHER' &&
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.lessonQuestion.findUnique({
      where: { id },
      include: { lesson: { select: { topic: { select: { schoolId: true } } } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (existing.lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const question = await db.lessonQuestion.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('LessonQuestion update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Delete a lesson question ──
async function deleteQuestion(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'TEACHER' &&
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.lessonQuestion.findUnique({
      where: { id },
      include: { lesson: { select: { topic: { select: { schoolId: true } } } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (existing.lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.lessonQuestion.delete({ where: { id } });

    return NextResponse.json({
      message: 'Question deleted',
      id,
    });
  } catch (error) {
    console.error('LessonQuestion delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getQuestion, 'dataRead');
export const PUT = withRateLimit(updateQuestion, 'dataWrite');
export const DELETE = withRateLimit(deleteQuestion, 'dataWrite');
