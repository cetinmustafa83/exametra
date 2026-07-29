import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
const targetAudienceEnum = z.enum(['all', 'teachers', 'students', 'parents', 'class']);

const createAnnouncementSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  priority: priorityEnum.optional().default('normal'),
  targetAudience: targetAudienceEnum.optional().default('all'),
  classGroupId: z.string().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  expiresAt: z.string().optional().nullable(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const priority = searchParams.get('priority');
    const targetAudience = searchParams.get('targetAudience');
    const classGroupId = searchParams.get('classGroupId');
    const isPinned = searchParams.get('isPinned');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };
    if (priority && priority !== 'all') where.priority = priority;
    if (targetAudience && targetAudience !== 'all') where.targetAudience = targetAudience;
    if (classGroupId && classGroupId !== 'all') where.classGroupId = classGroupId;
    if (isPinned === 'true') where.isPinned = true;

    // Filter by role-based target audience
    if (session.user?.role === 'STUDENT') {
      where.OR = [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
      ];
    } else if (session.user?.role === 'PARENT') {
      where.OR = [
        { targetAudience: 'all' },
        { targetAudience: 'parents' },
      ];
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Announcements GET error:', error);
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
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, classGroupId, expiresAt, ...rest } = parsed.data;

    // Verify school
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify classGroup if provided
    if (classGroupId) {
      const cg = await db.classGroup.findUnique({ where: { id: classGroupId } });
      if (!cg || cg.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
      }
    }

    const announcement = await db.announcement.create({
      data: {
        schoolId,
        authorId: session.userId,
        title: rest.title,
        content: rest.content,
        priority: rest.priority,
        targetAudience: rest.targetAudience,
        classGroupId: classGroupId || null,
        isPinned: rest.isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Announcements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
