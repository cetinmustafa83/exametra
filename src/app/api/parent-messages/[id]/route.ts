import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const categoryEnum = z.enum([
  'general',
  'progress',
  'assessment',
  'behavior',
  'attendance',
  'event',
]);

const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
const statusEnum = z.enum(['draft', 'sent', 'delivered', 'read', 'replied']);

const updateParentMessageSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: categoryEnum.optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  readAt: z.string().datetime().optional().nullable(),
  reply: z.string().optional().nullable(),
  replyAt: z.string().datetime().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const message = await db.parentMessage.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            relationship: true,
            preferredContact: true,
            preferredLanguage: true,
            notes: true,
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollments: {
              where: { endDate: null },
              select: {
                classGroup: { select: { id: true, name: true, gradeLevel: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // School-scoped access check
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      const student = await db.student.findUnique({
        where: { id: message.studentId },
        select: { schoolId: true },
      });
      if (student && student.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('ParentMessage GET error:', error);
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

    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateParentMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.parentMessage.findUnique({
      where: { id },
      include: { student: { select: { id: true, schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.subject !== undefined) data.subject = parsed.data.subject;
    if (parsed.data.body !== undefined) data.body = parsed.data.body;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.readAt !== undefined) {
      data.readAt = parsed.data.readAt ? new Date(parsed.data.readAt) : null;
    }
    if (parsed.data.reply !== undefined) {
      data.reply = parsed.data.reply || null;
    }
    if (parsed.data.replyAt !== undefined) {
      data.replyAt = parsed.data.replyAt ? new Date(parsed.data.replyAt) : null;
    }
    // If reply is set and status wasn't provided, mark as replied
    if (parsed.data.reply !== undefined && parsed.data.reply && parsed.data.status === undefined) {
      data.status = 'replied';
      if (!existing.replyAt && parsed.data.replyAt === undefined) {
        data.replyAt = new Date();
      }
    }
    // If marking as read and readAt not set
    if (parsed.data.status === 'read' && !existing.readAt && parsed.data.readAt === undefined) {
      data.readAt = new Date();
    }

    const updated = await db.parentMessage.update({
      where: { id },
      data,
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            relationship: true,
            preferredContact: true,
            preferredLanguage: true,
            notes: true,
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollments: {
              where: { endDate: null },
              select: {
                classGroup: { select: { id: true, name: true, gradeLevel: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'UPDATE',
        entityType: 'ParentMessage',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('ParentMessage PUT error:', error);
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

    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.parentMessage.findUnique({
      where: { id },
      include: { student: { select: { id: true, schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.student.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.parentMessage.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.student.schoolId,
        action: 'DELETE',
        entityType: 'ParentMessage',
        entityId: id,
        metadata: JSON.stringify({
          subject: existing.subject,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ParentMessage DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
