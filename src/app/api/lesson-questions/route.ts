import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List lesson questions ──
async function getQuestions(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const questionType = searchParams.get('questionType');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify lesson belongs to user's school
    const lesson = await db.subjectLesson.findUnique({
      where: { id: lessonId, deletedAt: null },
      include: { topic: { select: { schoolId: true } } },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const where: Record<string, unknown> = { lessonId };

    if (questionType) where.questionType = questionType;

    const questions = await db.lessonQuestion.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // For students: hide correct answers and explanations
    if (session.user.role === 'STUDENT') {
      const sanitized = questions.map((q) => ({
        ...q,
        correctAnswer: '',
        explanation: null,
      }));
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(questions);
  } catch (error) {
    console.error('LessonQuestions list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new lesson question ──
const createQuestionSchema = z.object({
  lessonId: z.string().min(1),
  questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching']),
  question: z.string().min(1),
  options: z.string().optional().nullable(), // JSON array string
  correctAnswer: z.string().min(1),
  explanation: z.string().optional().nullable(),
  points: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

async function createQuestion(request: Request) {
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

    const body = await request.json();
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify lesson belongs to user's school
    const lesson = await db.subjectLesson.findUnique({
      where: { id: parsed.data.lessonId, deletedAt: null },
      include: { topic: { select: { schoolId: true } } },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate options for multiple_choice and matching
    if (
      (parsed.data.questionType === 'multiple_choice' || parsed.data.questionType === 'matching') &&
      !parsed.data.options
    ) {
      return NextResponse.json(
        { error: 'Options are required for multiple_choice and matching questions' },
        { status: 400 }
      );
    }

    const question = await db.lessonQuestion.create({
      data: {
        lessonId: parsed.data.lessonId,
        questionType: parsed.data.questionType,
        question: parsed.data.question,
        options: parsed.data.options,
        correctAnswer: parsed.data.correctAnswer,
        explanation: parsed.data.explanation,
        points: parsed.data.points,
        sortOrder: parsed.data.sortOrder,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('LessonQuestion create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getQuestions, 'dataRead');
export const POST = withRateLimit(createQuestion, 'dataWrite');
