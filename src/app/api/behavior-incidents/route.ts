import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const severityEnum = z.enum(['minor', 'moderate', 'major']);

const createIncidentSchema = z.object({
  studentId: z.string().min(1),
  classGroupId: z.string().min(1).optional().nullable(),
  schoolId: z.string().min(1),
  categoryId: z.string().min(1),
  date: z.string().min(1),
  severity: severityEnum,
  description: z.string().min(1).max(2000),
  location: z.string().max(200).optional().nullable(),
  followUpAction: z.string().max(200).optional().nullable(),
  resolved: z.boolean().optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

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
    const studentId = searchParams.get('studentId');
    const classGroupId = searchParams.get('classGroupId');
    const schoolIdParam = searchParams.get('schoolId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const categoryId = searchParams.get('categoryId');
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    const teacherId = searchParams.get('teacherId');

    // Determine effective schoolId
    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };
    if (studentId) where.studentId = studentId;
    if (classGroupId && classGroupId !== 'all') where.classGroupId = classGroupId;
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;
    if (severity && severity !== 'all') where.severity = severity;
    if (teacherId) where.teacherId = teacherId;
    if (resolved === 'true') where.resolved = true;
    if (resolved === 'false') where.resolved = false;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }

    const incidents = await db.behaviorIncident.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            deletedAt: true,
          },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true, gradeLevel: true },
        },
        category: {
          select: { id: true, name: true, color: true, valence: true, icon: true },
        },
        resolvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('BehaviorIncidents GET error:', error);
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
    const parsed = createIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, studentId, categoryId, classGroupId, date, ...rest } = parsed.data;

    // Verify school
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

    // Verify student belongs to same school and is not deleted
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true, deletedAt: true },
    });
    if (!student || student.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Student not found in this school' }, { status: 404 });
    }
    if (student.deletedAt) {
      return NextResponse.json({ error: 'Student is deleted' }, { status: 400 });
    }

    // Verify category belongs to same school
    const category = await db.behaviorCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, schoolId: true },
    });
    if (!category || category.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Category not found in this school' }, { status: 404 });
    }

    // Verify classGroup belongs to same school (if provided)
    if (classGroupId) {
      const classGroup = await db.classGroup.findUnique({
        where: { id: classGroupId },
        select: { id: true, schoolId: true },
      });
      if (!classGroup || classGroup.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
      }
    }

    const resolved = parsed.data.resolved ?? false;
    const incident = await db.behaviorIncident.create({
      data: {
        studentId,
        teacherId: session.userId,
        classGroupId: classGroupId || null,
        schoolId,
        categoryId,
        date: new Date(date),
        severity: parsed.data.severity,
        description: parsed.data.description,
        location: parsed.data.location ?? null,
        followUpAction: parsed.data.followUpAction ?? null,
        resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedById: resolved ? session.userId : null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, deletedAt: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        category: { select: { id: true, name: true, color: true, valence: true, icon: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'BehaviorIncident',
        entityId: incident.id,
        metadata: JSON.stringify({
          studentId,
          categoryId,
          severity: parsed.data.severity,
          date,
        }),
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error('BehaviorIncidents POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
