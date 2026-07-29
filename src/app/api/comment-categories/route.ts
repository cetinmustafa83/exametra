import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createCategorySchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex like #10b981'),
  icon: z.string().max(20).optional().nullable(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const categories = await db.commentCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('CommentCategories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
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

    const { schoolId, name } = parsed.data;

    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      school.id !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await db.commentCategory.findUnique({
      where: { schoolId_name: { schoolId, name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists in this school' },
        { status: 409 }
      );
    }

    const category = await db.commentCategory.create({
      data: {
        schoolId,
        name,
        color: parsed.data.color,
        icon: parsed.data.icon ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'CommentCategory',
        entityId: category.id,
        metadata: JSON.stringify({ name, color: parsed.data.color }),
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('CommentCategories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
