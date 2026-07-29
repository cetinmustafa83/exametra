import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createSubjectSchema = z.object({
  schoolId: z.string().nullable().optional(),
  name: z.string().min(1),
  gradeLevelMin: z.number().int().default(1),
  gradeLevelMax: z.number().int().default(13),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    // Show global subjects (schoolId=null) and school-specific ones
    const where: Record<string, unknown> = {};
    if (schoolId) {
      where.OR = [
        { schoolId: null },
        { schoolId },
      ];
    }

    const subjects = await db.subject.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const subject = await db.subject.create({
      data: {
        schoolId: parsed.data.schoolId ?? null,
        name: parsed.data.name,
        gradeLevelMin: parsed.data.gradeLevelMin,
        gradeLevelMax: parsed.data.gradeLevelMax,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('Subjects POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  gradeLevelMin: z.number().int().optional(),
  gradeLevelMax: z.number().int().optional(),
});

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const subject = await db.subject.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'UPDATE',
        entityType: 'Subject',
        entityId: id,
        metadata: JSON.stringify(updateData),
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    console.error('Subjects PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    // Check if subject is used in any assessments or competency assignments
    const usageCount = await db.classCompetencyAssignment.count({
      where: { subjectId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: 'Subject is in use and cannot be deleted', usageCount },
        { status: 409 }
      );
    }

    await db.subject.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'DELETE',
        entityType: 'Subject',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subjects DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
