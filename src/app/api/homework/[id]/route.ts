import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const homeworkTypeEnum = z.enum(['assignment', 'reading', 'project', 'practice', 'research']);

const updateHomeworkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().min(1).optional(),
  homeworkType: homeworkTypeEnum.optional(),
  maxPoints: z.number().min(0).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  isPublished: z.boolean().optional(),
  subjectId: z.string().optional().nullable(),
  classGroupId: z.string().optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
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

    const { id } = await params;
    const homework = await db.homework.findUnique({
      where: { id, deletedAt: null },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    // Students can only see published homework
    if (session.user?.role === 'STUDENT' && !homework.isPublished) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(homework);
  } catch (error) {
    console.error('Homework GET [id] error:', error);
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
    const parsed = updateHomeworkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.homework.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    // Only the teacher who created it or admins can edit
    if (session.user?.role === 'TEACHER' && existing.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.dueDate !== undefined) updateData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.homeworkType !== undefined) updateData.homeworkType = parsed.data.homeworkType;
    if (parsed.data.maxPoints !== undefined) updateData.maxPoints = parsed.data.maxPoints;
    if (parsed.data.attachments !== undefined) updateData.attachments = parsed.data.attachments ? JSON.stringify(parsed.data.attachments) : null;
    if (parsed.data.isPublished !== undefined) updateData.isPublished = parsed.data.isPublished;
    if (parsed.data.subjectId !== undefined) updateData.subjectId = parsed.data.subjectId || null;
    if (parsed.data.classGroupId !== undefined) updateData.classGroupId = parsed.data.classGroupId;

    const homework = await db.homework.update({
      where: { id },
      data: updateData,
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(homework);
  } catch (error) {
    console.error('Homework PUT [id] error:', error);
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
    const existing = await db.homework.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    if (session.user?.role === 'TEACHER' && existing.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.homework.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Homework DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
