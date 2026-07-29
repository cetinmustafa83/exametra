import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const statusEnum = z.enum(['draft', 'scheduled', 'completed', 'cancelled']);

const updateLessonPlanSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  classGroupId: z.string().min(1).optional(),
  subjectId: z.string().optional().nullable(),
  date: z.string().min(1).optional(),
  durationMin: z.number().int().min(1).max(480).optional(),
  status: statusEnum.optional(),
  objectives: z.array(z.string()).optional().nullable(),
  materials: z.array(z.string()).optional().nullable(),
  homework: z.string().optional().nullable(),
  reflection: z.string().optional().nullable(),
  linkedCompetencyIds: z.array(z.string()).optional().nullable(),
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

    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true, schoolId: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    const isTeacher = lessonPlan.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      lessonPlan.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(lessonPlan);
  } catch (error) {
    console.error('LessonPlan GET error:', error);
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
    const parsed = updateLessonPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.lessonPlan.findUnique({
      where: { id },
      include: { classGroup: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.classGroupId !== undefined) data.classGroupId = parsed.data.classGroupId;
    if (parsed.data.subjectId !== undefined) data.subjectId = parsed.data.subjectId || null;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.durationMin !== undefined) data.durationMin = parsed.data.durationMin;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.homework !== undefined) data.homework = parsed.data.homework;
    if (parsed.data.reflection !== undefined) data.reflection = parsed.data.reflection;
    if (parsed.data.objectives !== undefined) {
      data.objectives = parsed.data.objectives ? JSON.stringify(parsed.data.objectives) : null;
    }
    if (parsed.data.materials !== undefined) {
      data.materials = parsed.data.materials ? JSON.stringify(parsed.data.materials) : null;
    }
    if (parsed.data.linkedCompetencyIds !== undefined) {
      data.linkedCompetencyIds = parsed.data.linkedCompetencyIds
        ? JSON.stringify(parsed.data.linkedCompetencyIds)
        : null;
    }

    const updated = await db.lessonPlan.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.classGroup.schoolId,
        action: 'UPDATE',
        entityType: 'LessonPlan',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('LessonPlan PUT error:', error);
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

    const existing = await db.lessonPlan.findUnique({
      where: { id },
      include: { classGroup: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.lessonPlan.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.classGroup.schoolId,
        action: 'DELETE',
        entityType: 'LessonPlan',
        entityId: id,
        metadata: JSON.stringify({ title: existing.title, date: existing.date.toISOString() }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LessonPlan DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
