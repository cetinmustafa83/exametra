import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List subject topics ──
async function getTopics(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const gradeLevel = searchParams.get('gradeLevel');
    const curriculumCode = searchParams.get('curriculumCode');

    const effectiveSchoolId = schoolId || session.user.schoolId;
    if (!effectiveSchoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      schoolId: effectiveSchoolId,
    };

    if (subjectId) where.subjectId = subjectId;
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (curriculumCode) where.curriculumCode = curriculumCode;

    const topics = await db.subjectTopic.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { lessons: { where: { deletedAt: null } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error('SubjectTopics list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new subject topic ──
const createTopicSchema = z.object({
  schoolId: z.string().optional(),
  subjectId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  curriculumCode: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  icon: z.string().optional().nullable(),
  color: z.string().default('#10b981'),
});

async function createTopic(request: Request) {
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
    const parsed = createTopicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schoolId = parsed.data.schoolId || session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'User must belong to a school to create topics' },
        { status: 400 }
      );
    }

    const topic = await db.subjectTopic.create({
      data: {
        schoolId,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        description: parsed.data.description,
        gradeLevel: parsed.data.gradeLevel,
        curriculumCode: parsed.data.curriculumCode,
        sortOrder: parsed.data.sortOrder,
        icon: parsed.data.icon,
        color: parsed.data.color,
      },
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { lessons: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('SubjectTopic create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getTopics, 'dataRead');
export const POST = withRateLimit(createTopic, 'dataWrite');
