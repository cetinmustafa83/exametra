import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateEntrySchema = z.object({
  categoryId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(200).optional(),
  text: z.string().min(1).max(5000).optional(),
  gradeLevel: z.string().max(50).optional().nullable(),
  schoolType: z.string().max(50).optional().nullable(),
  isPublic: z.boolean().optional(),
  tags: z.string().max(500).optional().nullable(),
  incrementUsage: z.boolean().optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const entry = await db.commentBankEntry.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      entry.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('CommentBankEntry GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.commentBankEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (parsed.data.categoryId && parsed.data.categoryId !== existing.categoryId) {
      const category = await db.commentCategory.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true, schoolId: true },
      });
      if (!category || category.schoolId !== existing.schoolId) {
        return NextResponse.json({ error: 'Category not found in this school' }, { status: 404 });
      }
    }

    if (parsed.data.subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: parsed.data.subjectId },
        select: { id: true, schoolId: true },
      });
      if (!subject || (subject.schoolId && subject.schoolId !== existing.schoolId)) {
        return NextResponse.json({ error: 'Subject not found in this school' }, { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.categoryId !== undefined) data.categoryId = parsed.data.categoryId;
    if (parsed.data.subjectId !== undefined) data.subjectId = parsed.data.subjectId || null;
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.text !== undefined) data.text = parsed.data.text;
    if (parsed.data.gradeLevel !== undefined) data.gradeLevel = parsed.data.gradeLevel ?? null;
    if (parsed.data.schoolType !== undefined) data.schoolType = parsed.data.schoolType ?? null;
    if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;
    if (parsed.data.tags !== undefined) data.tags = parsed.data.tags ?? null;

    // Increment usageCount if requested
    if (parsed.data.incrementUsage) {
      data.usageCount = existing.usageCount + 1;
    }

    const updated = await db.commentBankEntry.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'UPDATE',
        entityType: 'CommentBankEntry',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('CommentBankEntry PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.commentBankEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.commentBankEntry.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'CommentBankEntry',
        entityId: id,
        metadata: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CommentBankEntry DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
