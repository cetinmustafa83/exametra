import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return (
    role === 'TEACHER' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'SUPER_ADMIN'
  );
}

export async function POST(
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
    const existing = await db.rubric.findUnique({
      where: { id },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create a duplicate with incremented version
    const { criteria, ...rubricData } = existing;
    const duplicated = await db.rubric.create({
      data: {
        schoolId: rubricData.schoolId,
        teacherId: session.userId,
        subjectId: rubricData.subjectId,
        title: `${rubricData.title} (Kopie)`,
        description: rubricData.description,
        type: rubricData.type,
        maxPoints: rubricData.maxPoints,
        isPublic: false, // Duplicates start as private
        version: rubricData.version + 1,
        criteria: {
          create: criteria.map((c, ci) => ({
            name: c.name,
            description: c.description,
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
        schoolId: existing.schoolId,
        action: 'CREATE',
        entityType: 'Rubric',
        entityId: duplicated.id,
        metadata: JSON.stringify({
          title: duplicated.title,
          type: 'DUPLICATE',
          sourceRubricId: id,
          sourceTitle: existing.title,
        }),
      },
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error('Rubric Duplicate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
