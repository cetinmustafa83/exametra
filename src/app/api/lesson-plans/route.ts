import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const statusEnum = z.enum(['draft', 'scheduled', 'completed', 'cancelled']);

const createLessonPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  classGroupId: z.string().min(1),
  subjectId: z.string().optional().nullable(),
  date: z.string().min(1),
  durationMin: z.number().int().min(1).max(480).optional(),
  status: statusEnum.optional(),
  objectives: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  homework: z.string().optional().nullable(),
  reflection: z.string().optional().nullable(),
  linkedCompetencyIds: z.array(z.string()).optional(),
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
    const classGroupId = searchParams.get('classGroupId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');

    // Find all classes that belong to the user's school
    const schoolId = session.user?.schoolId ?? undefined;
    const classGroups = await db.classGroup.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true },
    });
    const schoolClassIds = classGroups.map((c) => c.id);

    if (schoolClassIds.length === 0) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = {};
    if (classGroupId && classGroupId !== 'all') {
      where.classGroupId = classGroupId;
    } else {
      where.classGroupId = { in: schoolClassIds };
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const lessonPlans = await db.lessonPlan.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(lessonPlans);
  } catch (error) {
    console.error('LessonPlans GET error:', error);
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
    const parsed = createLessonPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { classGroupId, subjectId, date, objectives, materials, linkedCompetencyIds, ...rest } = parsed.data;

    // Verify class exists and belongs to user's school
    const classGroup = await db.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true, schoolId: true },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      classGroup.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify subject (if provided) belongs to same school
    if (subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, schoolId: true },
      });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
      if (
        session.user?.role === 'SCHOOL_ADMIN' &&
        session.user.schoolId &&
        subject.schoolId &&
        subject.schoolId !== session.user.schoolId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const lessonPlan = await db.lessonPlan.create({
      data: {
        ...rest,
        teacherId: session.userId,
        classGroupId,
        subjectId: subjectId || null,
        date: new Date(date),
        objectives: objectives ? JSON.stringify(objectives) : null,
        materials: materials ? JSON.stringify(materials) : null,
        linkedCompetencyIds: linkedCompetencyIds ? JSON.stringify(linkedCompetencyIds) : null,
        homework: parsed.data.homework ?? null,
        reflection: parsed.data.reflection ?? null,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: classGroup.schoolId,
        action: 'CREATE',
        entityType: 'LessonPlan',
        entityId: lessonPlan.id,
        metadata: JSON.stringify({
          title: parsed.data.title,
          classGroupId,
          date,
        }),
      },
    });

    return NextResponse.json(lessonPlan, { status: 201 });
  } catch (error) {
    console.error('LessonPlans POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
