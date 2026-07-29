import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get a single subject lesson with questions ──
async function getLesson(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const lesson = await db.subjectLesson.findUnique({
      where: { id, deletedAt: null },
      include: {
        topic: {
          select: { id: true, title: true, schoolId: true, subjectId: true },
        },
        questions: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Access check: same school
    if (lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For students: hide correct answers and explanations
    if (session.user.role === 'STUDENT') {
      const sanitizedQuestions = lesson.questions.map((q) => ({
        ...q,
        correctAnswer: '',
        explanation: null,
      }));
      return NextResponse.json({ ...lesson, questions: sanitizedQuestions });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('SubjectLesson get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a subject lesson ──
const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  lessonType: z.enum(['explanation', 'exercise', 'quiz', 'flashcard', 'video_link']).optional(),
  content: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  sortOrder: z.number().int().optional(),
  estimatedMinutes: z.number().int().optional().nullable(),
});

async function updateLesson(
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

    const existing = await db.subjectLesson.findUnique({
      where: { id, deletedAt: null },
      include: { topic: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (existing.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const lesson = await db.subjectLesson.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: { select: { questions: { where: { isDemo: false } } } },
      },
    });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('SubjectLesson update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Soft delete a subject lesson ──
async function deleteLesson(
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

    const existing = await db.subjectLesson.findUnique({
      where: { id, deletedAt: null },
      include: { topic: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (existing.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const deleted = await db.subjectLesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Lesson deleted',
      id: deleted.id,
    });
  } catch (error) {
    console.error('SubjectLesson delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getLesson, 'dataRead');
export const PUT = withRateLimit(updateLesson, 'dataWrite');
export const DELETE = withRateLimit(deleteLesson, 'dataWrite');
