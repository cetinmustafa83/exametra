import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── PUT: Update a page ──
const updatePageSchema = z.object({
  textContent: z.string().optional().nullable(),
  drawingData: z.string().optional().nullable(),
  background: z
    .enum(['lined', 'grid', 'blank', 'dotted', 'music'])
    .optional(),
  isBookmark: z.boolean().optional(),
  title: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, pageId } = await params;

    const page = await db.notebookPage.findUnique({
      where: { id: pageId },
      include: { notebook: true },
    });

    if (!page || page.notebookId !== id) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.notebook.deletedAt) {
      return NextResponse.json(
        { error: 'Notebook has been deleted' },
        { status: 400 }
      );
    }

    if (page.notebook.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updatedPage = await db.notebookPage.update({
      where: { id: pageId },
      data: parsed.data,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: page.notebook.schoolId,
        action: 'UPDATE',
        entityType: 'NotebookPage',
        entityId: pageId,
        metadata: JSON.stringify({
          notebookId: id,
          pageNumber: page.pageNumber,
          updatedFields: Object.keys(parsed.data),
        }),
      },
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Notebook page update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Delete a page ──
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, pageId } = await params;

    const page = await db.notebookPage.findUnique({
      where: { id: pageId },
      include: { notebook: true },
    });

    if (!page || page.notebookId !== id) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.notebook.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.notebookPage.delete({
      where: { id: pageId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: page.notebook.schoolId,
        action: 'DELETE',
        entityType: 'NotebookPage',
        entityId: pageId,
        metadata: JSON.stringify({
          notebookId: id,
          pageNumber: page.pageNumber,
        }),
      },
    });

    return NextResponse.json({
      message: 'Page deleted',
      id: pageId,
    });
  } catch (error) {
    console.error('Notebook page delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
