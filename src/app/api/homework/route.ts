import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const homeworkTypeEnum = z.enum(['assignment', 'reading', 'project', 'practice', 'research']);

const createHomeworkSchema = z.object({
  schoolId: z.string().min(1),
  classGroupId: z.string().min(1),
  subjectId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().min(1),
  homeworkType: homeworkTypeEnum.optional().default('assignment'),
  maxPoints: z.number().min(0).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  isPublished: z.boolean().optional().default(true),
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
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');
    const teacherId = searchParams.get('teacherId');
    const homeworkType = searchParams.get('homeworkType');
    const isPublished = searchParams.get('isPublished');
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId, deletedAt: null };
    if (classGroupId && classGroupId !== 'all') where.classGroupId = classGroupId;
    if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;
    if (homeworkType && homeworkType !== 'all') where.homeworkType = homeworkType;
    if (isPublished === 'true') where.isPublished = true;
    if (isPublished === 'false') where.isPublished = false;
    if (dueDateFrom || dueDateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dueDateFrom) dateFilter.gte = new Date(dueDateFrom);
      if (dueDateTo) dateFilter.lte = new Date(dueDateTo);
      where.dueDate = dateFilter;
    }

    // For students, only show published homework
    if (session.user?.role === 'STUDENT') {
      where.isPublished = true;
    }

    const homeworks = await db.homework.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json(homeworks);
  } catch (error) {
    console.error('Homework GET error:', error);
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
    const parsed = createHomeworkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, classGroupId, subjectId, dueDate, attachments, ...rest } = parsed.data;

    // Verify school
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify classGroup
    const classGroup = await db.classGroup.findUnique({ where: { id: classGroupId } });
    if (!classGroup || classGroup.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
    }

    // Verify subject if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    const homework = await db.homework.create({
      data: {
        schoolId,
        classGroupId,
        subjectId: subjectId || null,
        teacherId: session.userId,
        title: rest.title,
        description: rest.description ?? null,
        dueDate: new Date(dueDate),
        homeworkType: rest.homeworkType,
        maxPoints: rest.maxPoints ?? null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        isPublished: rest.isPublished,
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(homework, { status: 201 });
  } catch (error) {
    console.error('Homework POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
