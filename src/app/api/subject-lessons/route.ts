import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List subject lessons ──
async function getLessons(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    const lessonType = searchParams.get('lessonType');
    const difficulty = searchParams.get('difficulty');

    if (!topicId) {
      return NextResponse.json(
        { error: 'topicId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify topic belongs to user's school
    const topic = await db.subjectTopic.findUnique({
      where: { id: topicId, deletedAt: null },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      topicId,
    };

    if (lessonType) where.lessonType = lessonType;
    if (difficulty) where.difficulty = difficulty;

    const lessons = await db.subjectLesson.findMany({
      where,
      include: {
        _count: { select: { questions: { where: { isDemo: false } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error('SubjectLessons list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new subject lesson ──
const createLessonSchema = z.object({
  topicId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  lessonType: z.enum(['explanation', 'exercise', 'quiz', 'flashcard', 'video_link']).default('explanation'),
  content: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  sortOrder: z.number().int().default(0),
  estimatedMinutes: z.number().int().optional().nullable(),
});

async function createLesson(request: Request) {
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
    const parsed = createLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify topic belongs to user's school
    const topic = await db.subjectTopic.findUnique({
      where: { id: parsed.data.topicId, deletedAt: null },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const lesson = await db.subjectLesson.create({
      data: {
        topicId: parsed.data.topicId,
        title: parsed.data.title,
        description: parsed.data.description,
        lessonType: parsed.data.lessonType,
        content: parsed.data.content,
        difficulty: parsed.data.difficulty,
        sortOrder: parsed.data.sortOrder,
        estimatedMinutes: parsed.data.estimatedMinutes,
      },
      include: {
        _count: { select: { questions: { where: { isDemo: false } } } },
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('SubjectLesson create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getLessons, 'dataRead');
export const POST = withRateLimit(createLesson, 'dataWrite');
