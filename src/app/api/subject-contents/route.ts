import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List subject contents ──
async function getContents(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user.schoolId;
    const categoryId = searchParams.get('categoryId');
    const subjectId = searchParams.get('subjectId');
    const contentType = searchParams.get('contentType');
    const parentId = searchParams.get('parentId');
    const isActive = searchParams.get('isActive');

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };
    if (categoryId) where.categoryId = categoryId;
    if (subjectId) where.subjectId = subjectId;
    if (contentType) where.contentType = contentType;
    if (parentId) where.parentId = parentId;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const contents = await db.subjectContent.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { children: { where: { isActive: true } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(contents);
  } catch (error) {
    console.error('SubjectContents GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create subject content ──
const createContentSchema = z.object({
  schoolId: z.string().optional(),
  categoryId: z.string().min(1),
  subjectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().optional().nullable(),
  contentType: z.enum(['topic', 'exercise', 'lesson', 'quiz', 'vocabulary']).default('topic'),
  content: z.string().optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.number().int().default(0),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sourceUrl: z.string().optional().nullable(),
});

async function createContent(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'TEACHER' &&
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schoolId = parsed.data.schoolId || session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'User must belong to a school' }, { status: 400 });
    }

    const contentItem = await db.subjectContent.create({
      data: {
        schoolId,
        categoryId: parsed.data.categoryId,
        subjectId: parsed.data.subjectId,
        parentId: parsed.data.parentId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        icon: parsed.data.icon,
        contentType: parsed.data.contentType,
        content: parsed.data.content,
        difficulty: parsed.data.difficulty,
        questionCount: parsed.data.questionCount,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        isPublic: parsed.data.isPublic,
        sourceUrl: parsed.data.sourceUrl,
      },
      include: {
        category: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contentItem, { status: 201 });
  } catch (error) {
    console.error('SubjectContent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getContents, 'dataRead');
export const POST = withRateLimit(createContent, 'dataWrite');
