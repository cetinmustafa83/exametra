import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get single category ──
async function getCategory(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const category = await db.subjectCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { contents: { where: { isActive: true } } } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('SubjectCategory GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update category ──
const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

async function updateCategory(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const category = await db.subjectCategory.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('SubjectCategory PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Soft delete / deactivate category ──
async function deleteCategory(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const category = await db.subjectCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('SubjectCategory DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getCategory, 'dataRead');
export const PUT = withRateLimit(updateCategory, 'dataWrite');
export const DELETE = withRateLimit(deleteCategory, 'dataWrite');
