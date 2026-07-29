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

const createParentMessageSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: categoryEnum.optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
});

const listWhereSchema = z.object({
  teacherId: z.string().optional(),
  parentId: z.string().optional(),
  studentId: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const rawParams = {
      teacherId: searchParams.get('teacherId') ?? undefined,
      parentId: searchParams.get('parentId') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    };

    const parsed = listWhereSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

    // Restrict to messages whose student belongs to user's school if SCHOOL_ADMIN
    const where: Record<string, unknown> = {};
    if (parsed.data.teacherId) where.teacherId = parsed.data.teacherId;
    if (parsed.data.parentId) where.parentId = parsed.data.parentId;
    if (parsed.data.studentId) where.studentId = parsed.data.studentId;
    if (parsed.data.category && parsed.data.category !== 'all') where.category = parsed.data.category;
    if (parsed.data.status && parsed.data.status !== 'all') where.status = parsed.data.status;

    if (session.user?.schoolId && session.user.role !== 'SUPER_ADMIN') {
      where.student = { schoolId: session.user.schoolId };
    }

    const messages = await db.parentMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('ParentMessages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createParentMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { parentId, studentId, ...rest } = parsed.data;

    // Verify parent contact exists and matches student
    const parent = await db.parentContact.findUnique({
      where: { id: parentId },
      include: { student: { select: { id: true, schoolId: true, deletedAt: true } } },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent contact not found' }, { status: 404 });
    }

    if (parent.studentId !== studentId) {
      return NextResponse.json(
        { error: 'Parent contact does not belong to this student' },
        { status: 400 }
      );
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      parent.student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message = await db.parentMessage.create({
      data: {
        parentId,
        teacherId: session.userId,
        studentId,
        subject: rest.subject,
        body: rest.body,
        category: rest.category ?? 'general',
        priority: rest.priority ?? 'normal',
        status: rest.status ?? 'sent',
      },
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
        schoolId: parent.student.schoolId,
        action: 'CREATE',
        entityType: 'ParentMessage',
        entityId: message.id,
        metadata: JSON.stringify({
          parentId,
          studentId,
          subject: rest.subject,
          category: rest.category ?? 'general',
          priority: rest.priority ?? 'normal',
        }),
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('ParentMessages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
