import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';
import { getTeacherClassIds } from '@/lib/access-policy';

// ── GET: List student answers (for the current student) ──
async function getAnswers(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    const lessonId = searchParams.get('lessonId');

    const userId = session.user.id;

    if (session.user.role === 'STUDENT') {
      // Students see only their own answers
      const where: Record<string, unknown> = {
        studentId: userId,
      };

      if (questionId) where.questionId = questionId;

      // If lessonId is provided, filter by questions in that lesson
      if (lessonId) {
        const answers = await db.studentAnswer.findMany({
          where: {
            studentId: userId,
            question: {
              lessonId,
            },
          },
          include: {
            question: {
              select: {
                id: true,
                questionType: true,
                question: true,
                correctAnswer: true,
                explanation: true,
                points: true,
                lessonId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(answers);
      }

      const answers = await db.studentAnswer.findMany({
        where,
        include: {
          question: {
            select: {
              id: true,
              questionType: true,
              question: true,
              correctAnswer: true,
              explanation: true,
              points: true,
              lessonId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(answers);
    }

    if (session.user.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Teachers / Admins: can see answers for their school
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = {};

    if (questionId) where.questionId = questionId;

    if (lessonId) {
      if (session.user.role === 'TEACHER') {
        const classIds = await getTeacherClassIds(session.user.id);
        const lesson = await db.subjectLesson.findFirst({ where: { id: lessonId, topic: { schoolId } }, select: { id: true } });
        if (!lesson || classIds.length === 0) return NextResponse.json([]);
      }
      const answers = await db.studentAnswer.findMany({
        where: {
          question: {
            lessonId,
            lesson: {
              topic: { schoolId },
            },
          },
        },
        include: {
          question: {
            select: {
              id: true,
              questionType: true,
              question: true,
              correctAnswer: true,
              explanation: true,
              points: true,
              lessonId: true,
            },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(answers);
    }

    // For teachers without lessonId filter, return empty (too broad)
    return NextResponse.json([]);
  } catch (error) {
    console.error('StudentAnswers list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Submit a student answer ──
const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
  timeTakenMs: z.number().int().optional().nullable(),
});

async function submitAnswer(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit answers' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = submitAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify question exists and belongs to user's school
    const question = await db.lessonQuestion.findUnique({
      where: { id: parsed.data.questionId },
      include: {
        lesson: {
          select: { topic: { select: { schoolId: true } } },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (question.lesson.topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if the answer is correct
    const isCorrect =
      parsed.data.answer.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();

    // Upsert the answer (unique constraint on questionId + studentId)
    const studentAnswer = await db.studentAnswer.upsert({
      where: {
        questionId_studentId: {
          questionId: parsed.data.questionId,
          studentId: session.user.id,
        },
      },
      create: {
        questionId: parsed.data.questionId,
        studentId: session.user.id,
        answer: parsed.data.answer,
        isCorrect,
        timeTakenMs: parsed.data.timeTakenMs,
        attempts: 1,
      },
      update: {
        answer: parsed.data.answer,
        isCorrect,
        timeTakenMs: parsed.data.timeTakenMs,
        attempts: { increment: 1 },
      },
    });

    // Return the answer with correctness info (for immediate feedback)
    return NextResponse.json({
      ...studentAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error('StudentAnswer submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getAnswers, 'dataRead');
export const POST = withRateLimit(submitAnswer, 'dataWrite');
