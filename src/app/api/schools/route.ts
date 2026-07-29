import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createSchoolSchema = z.object({
  name: z.string().min(1),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']),
  country: z.string().default('DE'),
  timezone: z.string().default('Europe/Berlin'),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolType = searchParams.get('schoolType');

    const where: Record<string, unknown> = {};
    if (schoolType) where.schoolType = schoolType;

    // If user is not super admin, only show their school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.id = session.user.schoolId;
    }

    const schools = await db.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            classGroups: true,
            students: { where: { deletedAt: null } },
          },
        },
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Schools GET error:', error);
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
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const school = await db.school.create({
      data: parsed.data,
    });

    return NextResponse.json(school, { status: 201 });
  } catch (error) {
    console.error('Schools POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateSchoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']).optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
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
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    // Verify user has access to this school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const school = await db.school.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            classGroups: true,
            students: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: id,
        action: 'UPDATE',
        entityType: 'School',
        entityId: id,
        metadata: JSON.stringify(updateData),
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error('Schools PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
