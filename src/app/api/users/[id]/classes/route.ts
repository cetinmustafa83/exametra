import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const assignClassesSchema = z.object({
  classGroupIds: z.array(z.string()),
});

// GET — list all class assignments + available classes for selection
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
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      user.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignments = await db.classGroupTeacher.findMany({
      where: { userId: id },
      include: {
        classGroup: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            schoolType: true,
            schoolYear: { select: { id: true, label: true } },
          },
        },
      },
    });

    const availableClasses = user.schoolId
      ? await db.classGroup.findMany({
          where: { schoolId: user.schoolId },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            schoolType: true,
            schoolYear: { select: { id: true, label: true } },
          },
        })
      : [];

    return NextResponse.json({
      assignments,
      availableClasses,
    });
  } catch (error) {
    console.error('User classes GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — assign teacher to a set of classes (replace all)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = assignClassesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      user.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate that all class groups belong to the user's school
    const targetClassIds = parsed.data.classGroupIds;
    if (targetClassIds.length > 0) {
      const validClasses = await db.classGroup.findMany({
        where: {
          id: { in: targetClassIds },
          ...(user.schoolId ? { schoolId: user.schoolId } : {}),
        },
        select: { id: true },
      });
      if (validClasses.length !== targetClassIds.length) {
        return NextResponse.json(
          { error: 'Some classes were not found in this school' },
          { status: 400 }
        );
      }
    }

    // Replace all existing teacher assignments with the new list.
    // Use a transaction to keep this atomic.
    await db.$transaction(async (tx) => {
      await tx.classGroupTeacher.deleteMany({
        where: { userId: id },
      });

      if (targetClassIds.length > 0) {
        await tx.classGroupTeacher.createMany({
          data: targetClassIds.map((classGroupId) => ({
            classGroupId,
            userId: id,
            role: 'SUBJECT_TEACHER',
          })),
        });
      }
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: user.schoolId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        metadata: JSON.stringify({
          assignedClassIds: targetClassIds,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      assigned: targetClassIds.length,
    });
  } catch (error) {
    console.error('User classes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
