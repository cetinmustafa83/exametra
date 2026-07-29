import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List notebooks for the current user ──
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const classGroupId = searchParams.get('classGroupId');
    const isArchived = searchParams.get('isArchived');

    const where: Record<string, unknown> = {
      ownerId: session.user.id,
      deletedAt: null,
    };

    if (schoolId) where.schoolId = schoolId;
    if (subjectId) where.subjectId = subjectId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (isArchived !== null && isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    }

    // Default schoolId from user session
    if (!schoolId && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    const notebooks = await db.notebook.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error('Notebooks list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new notebook ──
const createNotebookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  notebookType: z
    .enum(['lined', 'grid', 'blank', 'dotted', 'music', 'calligraphy'])
    .default('lined'),
  color: z.string().default('#10b981'),
  icon: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classGroupId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createNotebookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, notebookType, color, icon, subjectId, classGroupId } =
      parsed.data;

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'User must belong to a school to create notebooks' },
        { status: 400 }
      );
    }

    const notebook = await db.notebook.create({
      data: {
        schoolId,
        ownerId: session.user.id,
        ownerType: 'TEACHER',
        title,
        description,
        notebookType,
        color,
        icon,
        subjectId,
        classGroupId,
      },
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
        schoolId,
        action: 'CREATE',
        entityType: 'Notebook',
        entityId: notebook.id,
        metadata: JSON.stringify({ title }),
      },
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error('Notebook create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
