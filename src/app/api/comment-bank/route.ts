import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createEntrySchema = z.object({
  schoolId: z.string().min(1),
  categoryId: z.string().min(1),
  subjectId: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(5000),
  gradeLevel: z.string().max(50).optional().nullable(),
  schoolType: z.string().max(50).optional().nullable(),
  isPublic: z.boolean().optional(),
  tags: z.string().max(500).optional().nullable(),
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
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const gradeLevel = searchParams.get('gradeLevel');
    const isPublic = searchParams.get('isPublic');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };

    // Show public comments + own comments
    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;
    if (gradeLevel && gradeLevel !== 'all') where.gradeLevel = gradeLevel;
    if (isPublic === 'true') where.isPublic = true;
    if (isPublic === 'false') where.isPublic = false;

    // Full-text search on title, text, tags
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { text: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    const entries = await db.commentBankEntry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('CommentBank GET error:', error);
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
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, categoryId, subjectId } = parsed.data;

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

    const category = await db.commentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, schoolId: true },
    });
    if (!category || category.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Category not found in this school' }, { status: 404 });
    }

    if (subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, schoolId: true },
      });
      if (!subject || (subject.schoolId && subject.schoolId !== schoolId)) {
        return NextResponse.json({ error: 'Subject not found in this school' }, { status: 404 });
      }
    }

    const entry = await db.commentBankEntry.create({
      data: {
        schoolId,
        teacherId: session.userId,
        categoryId,
        subjectId: subjectId || null,
        title: parsed.data.title,
        text: parsed.data.text,
        gradeLevel: parsed.data.gradeLevel ?? null,
        schoolType: parsed.data.schoolType ?? null,
        isPublic: parsed.data.isPublic ?? false,
        tags: parsed.data.tags ?? null,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'CommentBankEntry',
        entityId: entry.id,
        metadata: JSON.stringify({ title: parsed.data.title, categoryId }),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('CommentBank POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
