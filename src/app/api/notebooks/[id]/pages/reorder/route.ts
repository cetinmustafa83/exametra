import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── PUT: Reorder pages ──
const reorderSchema = z.object({
  pageOrders: z.array(
    z.object({
      id: z.string(),
      pageNumber: z.number().int(),
    })
  ),
});

export async function PUT(
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
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Update each page's pageNumber in a transaction
    await db.$transaction(
      parsed.data.pageOrders.map((po) =>
        db.notebookPage.update({
          where: { id: po.id },
          data: { pageNumber: po.pageNumber },
        })
      )
    );

    // Return updated pages
    const pages = await db.notebookPage.findMany({
      where: { notebookId: id },
      orderBy: { pageNumber: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Notebook page reorder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
