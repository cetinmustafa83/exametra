import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List subject categories ──
async function getCategories(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user.schoolId;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await db.subjectCategory.findMany({
      where,
      include: {
        _count: { select: { contents: { where: { isActive: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('SubjectCategories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create a new subject category ──
const createCategorySchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

async function createCategory(request: Request) {
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

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
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

    const category = await db.subjectCategory.create({
      data: {
        schoolId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        icon: parsed.data.icon,
        sortOrder: parsed.data.sortOrder,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('SubjectCategory POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getCategories, 'dataRead');
export const POST = withRateLimit(createCategory, 'dataWrite');
