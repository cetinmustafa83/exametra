import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

const levelSchema = z.object({
  id: z.string().optional(), // for updates
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  points: z.int().min(0),
  order: z.int().min(0).default(0),
});

const criterionSchema = z.object({
  id: z.string().optional(), // for updates
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  weight: z.number().min(0).default(1.0),
  maxPoints: z.int().min(1),
  order: z.int().min(0).default(0),
  levels: z.array(levelSchema).min(1),
});

const createRubricSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(['ANALYTIC', 'HOLISTIC']).default('ANALYTIC'),
  subjectId: z.string().optional().nullable(),
  maxPoints: z.int().min(1).default(100),
  isPublic: z.boolean().default(false),
  criteria: z.array(criterionSchema).min(1),
});

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
      OR: [
        { schoolId, teacherId: session.userId },
        { schoolId, isPublic: true },
      ],
    };

    if (teacherId) {
      where.teacherId = teacherId;
    }
    if (subjectId && subjectId !== 'all') {
      where.subjectId = subjectId;
    }

    // If teacherId filter is set, override the OR to a simple AND
    if (teacherId) {
      const simpleWhere: Record<string, unknown> = { schoolId, teacherId };
      if (subjectId && subjectId !== 'all') simpleWhere.subjectId = subjectId;

      const rubrics = await db.rubric.findMany({
        where: simpleWhere,
        orderBy: { updatedAt: 'desc' },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
            include: { levels: { orderBy: { order: 'asc' } } },
          },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(rubrics);
    }

    const rubrics = await db.rubric.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(rubrics);
  } catch (error) {
    console.error('Rubrics GET error:', error);
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
    const parsed = createRubricSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, criteria, subjectId, ...rest } = parsed.data;

    // Verify school exists
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

    // Verify subject if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    const rubric = await db.rubric.create({
      data: {
        schoolId,
        teacherId: session.userId,
        subjectId: subjectId ?? null,
        ...rest,
        criteria: {
          create: criteria.map((c, ci) => ({
            name: c.name,
            description: c.description ?? null,
            weight: c.weight,
            maxPoints: c.maxPoints,
            order: c.order ?? ci,
            levels: {
              create: c.levels.map((l, li) => ({
                label: l.label,
                description: l.description,
                points: l.points,
                order: l.order ?? li,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'Rubric',
        entityId: rubric.id,
        metadata: JSON.stringify({ title: rubric.title, type: rubric.type, criteriaCount: criteria.length }),
      },
    });

    return NextResponse.json(rubric, { status: 201 });
  } catch (error) {
    console.error('Rubrics POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
