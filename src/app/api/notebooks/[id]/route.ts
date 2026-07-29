import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get a single notebook with its pages ──
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
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    // Access check: owner or public notebook in the same school
    if (
      notebook.ownerId !== session.user.id &&
      !(notebook.isPublic && notebook.schoolId === session.user.schoolId)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Notebook get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── PUT: Update notebook ──
const updateNotebookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  notebookType: z
    .enum([
      'lined', 'grid', 'blank', 'dotted', 'music', 'calligraphy',
      // German curriculum types
      'deutschheft', 'matheheft', 'sachbuch', 'musikheft',
      'kunstheft', 'englischheft', 'geschichtsheft', 'religionsheft',
      'sachkundeheft',
    ])
    .optional(),
  color: z.string().optional(),
  icon: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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

    const existing = await db.notebook.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateNotebookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const notebook = await db.notebook.update({
      where: { id },
      data: parsed.data,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: existing.schoolId,
        action: 'UPDATE',
        entityType: 'Notebook',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(parsed.data) }),
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Notebook update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Soft delete notebook ──
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.notebook.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const deleted = await db.notebook.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'Notebook',
        entityId: id,
        metadata: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({
      message: 'Notebook deleted',
      id: deleted.id,
    });
  } catch (error) {
    console.error('Notebook delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
