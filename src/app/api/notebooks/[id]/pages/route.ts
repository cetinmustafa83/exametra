import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List pages in a notebook ──
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const notebook = await db.notebook.findUnique({
      where: { id, deletedAt: null },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    // Access check
    if (
      notebook.ownerId !== session.user.id &&
      !(notebook.isPublic && notebook.schoolId === session.user.schoolId)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const pages = await db.notebookPage.findMany({
      where: { notebookId: id },
      orderBy: { pageNumber: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Notebook pages list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Add a new page to a notebook ──
const createPageSchema = z.object({
  pageNumber: z.number().int().optional(),
  contentType: z.enum(['text', 'drawing', 'mixed']).default('text'),
  textContent: z.string().optional().nullable(),
  drawingData: z.string().optional().nullable(),
  background: z
    .enum(['lined', 'grid', 'blank', 'dotted', 'music'])
    .default('lined'),
  title: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const notebook = await db.notebook.findUnique({
      where: { id, deletedAt: null },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    if (notebook.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Auto-increment pageNumber if not provided
    let pageNumber = parsed.data.pageNumber;
    if (!pageNumber) {
      const maxPage = await db.notebookPage.findFirst({
        where: { notebookId: id },
        orderBy: { pageNumber: 'desc' },
        select: { pageNumber: true },
      });
      pageNumber = maxPage ? maxPage.pageNumber + 1 : 1;
    }

    // Use notebook's notebookType as default background if not specified differently
    const background =
      parsed.data.background ||
      (['lined', 'grid', 'blank', 'dotted', 'music'].includes(
        notebook.notebookType
      )
        ? notebook.notebookType
        : 'lined');

    const page = await db.notebookPage.create({
      data: {
        notebookId: id,
        pageNumber,
        title: parsed.data.title,
        contentType: parsed.data.contentType,
        textContent: parsed.data.textContent,
        drawingData: parsed.data.drawingData,
        background,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: notebook.schoolId,
        action: 'CREATE',
        entityType: 'NotebookPage',
        entityId: page.id,
        metadata: JSON.stringify({
          notebookId: id,
          pageNumber,
          contentType: parsed.data.contentType,
        }),
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Notebook page create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
