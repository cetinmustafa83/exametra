import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const severityEnum = z.enum(['minor', 'moderate', 'major']);

const updateIncidentSchema = z.object({
  studentId: z.string().min(1).optional(),
  classGroupId: z.string().min(1).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  severity: severityEnum.optional(),
  description: z.string().min(1).max(2000).optional(),
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

export async function GET(
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
    const incident = await db.behaviorIncident.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, deletedAt: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        category: { select: { id: true, name: true, color: true, valence: true, icon: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      incident.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('BehaviorIncident GET error:', error);
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
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.behaviorIncident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate references when they're being changed
    if (parsed.data.studentId && parsed.data.studentId !== existing.studentId) {
      const student = await db.student.findUnique({
        where: { id: parsed.data.studentId },
        select: { id: true, schoolId: true, deletedAt: true },
      });
      if (!student || student.schoolId !== existing.schoolId) {
        return NextResponse.json({ error: 'Student not found in this school' }, { status: 404 });
      }
      if (student.deletedAt) {
        return NextResponse.json({ error: 'Student is deleted' }, { status: 400 });
      }
    }
    if (parsed.data.categoryId && parsed.data.categoryId !== existing.categoryId) {
      const category = await db.behaviorCategory.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true, schoolId: true },
      });
      if (!category || category.schoolId !== existing.schoolId) {
        return NextResponse.json({ error: 'Category not found in this school' }, { status: 404 });
      }
    }
    if (parsed.data.classGroupId) {
      const classGroup = await db.classGroup.findUnique({
        where: { id: parsed.data.classGroupId },
        select: { id: true, schoolId: true },
      });
      if (!classGroup || classGroup.schoolId !== existing.schoolId) {
        return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.studentId !== undefined) data.studentId = parsed.data.studentId;
    if (parsed.data.classGroupId !== undefined) data.classGroupId = parsed.data.classGroupId || null;
    if (parsed.data.categoryId !== undefined) data.categoryId = parsed.data.categoryId;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.severity !== undefined) data.severity = parsed.data.severity;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.location !== undefined) data.location = parsed.data.location ?? null;
    if (parsed.data.followUpAction !== undefined) data.followUpAction = parsed.data.followUpAction ?? null;

    // Handle resolved transitions
    if (parsed.data.resolved !== undefined && parsed.data.resolved !== existing.resolved) {
      data.resolved = parsed.data.resolved;
      if (parsed.data.resolved) {
        data.resolvedAt = new Date();
        data.resolvedById = session.userId;
      } else {
        data.resolvedAt = null;
        data.resolvedById = null;
      }
    }

    const updated = await db.behaviorIncident.update({
      where: { id },
      data,
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
        schoolId: existing.schoolId,
        action: 'UPDATE',
        entityType: 'BehaviorIncident',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('BehaviorIncident PUT error:', error);
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
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.behaviorIncident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.behaviorIncident.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.schoolId,
        action: 'DELETE',
        entityType: 'BehaviorIncident',
        entityId: id,
        metadata: JSON.stringify({
          studentId: existing.studentId,
          categoryId: existing.categoryId,
          date: existing.date.toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BehaviorIncident DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
