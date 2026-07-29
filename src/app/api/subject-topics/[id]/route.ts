import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get a single subject topic with lessons ──
async function getTopic(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const topic = await db.subjectTopic.findUnique({
      where: { id, deletedAt: null },
      include: {
        subject: { select: { id: true, name: true } },
        lessons: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            _count: { select: { questions: { where: { isDemo: false } } } },
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Access check: same school
    if (topic.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('SubjectTopic get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a subject topic ──
const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  curriculumCode: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  icon: z.string().optional().nullable(),
  color: z.string().optional(),
});

async function updateTopic(
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

    const existing = await db.subjectTopic.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (existing.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTopicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const topic = await db.subjectTopic.update({
      where: { id },
      data: parsed.data,
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { lessons: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error('SubjectTopic update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Soft delete a subject topic ──
async function deleteTopic(
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

    const existing = await db.subjectTopic.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (existing.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete the topic (cascade will handle lessons)
    const deleted = await db.subjectTopic.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Topic deleted',
      id: deleted.id,
    });
  } catch (error) {
    console.error('SubjectTopic delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getTopic, 'dataRead');
export const PUT = withRateLimit(updateTopic, 'dataWrite');
export const DELETE = withRateLimit(deleteTopic, 'dataWrite');
