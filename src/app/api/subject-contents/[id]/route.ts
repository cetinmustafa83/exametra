import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get single content ──
async function getContent(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const content = await db.subjectContent.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subject: { select: { id: true, name: true } },
        parent: { select: { id: true, title: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error('SubjectContent GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update content ──
const updateContentSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().optional().nullable(),
  contentType: z.enum(['topic', 'exercise', 'lesson', 'quiz', 'vocabulary']).optional(),
  content: z.string().optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  questionCount: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sourceUrl: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

async function updateContent(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // SCHOOL_ADMIN, VICE_PRINCIPAL can edit directly; TEACHER must use change request
    if (session.user.role === 'TEACHER') {
      return NextResponse.json(
        { error: 'Teachers must submit a change request to edit content' },
        { status: 403 }
      );
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentItem = await db.subjectContent.update({
      where: { id },
      data: parsed.data,
      include: {
        category: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contentItem);
  } catch (error) {
    console.error('SubjectContent PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete content ──
async function deleteContent(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Soft delete by deactivating
    const contentItem = await db.subjectContent.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, content: contentItem });
  } catch (error) {
    console.error('SubjectContent DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getContent, 'dataRead');
export const PUT = withRateLimit(updateContent, 'dataWrite');
export const DELETE = withRateLimit(deleteContent, 'dataWrite');
