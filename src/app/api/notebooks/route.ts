import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass } from '@/lib/access-policy';

// ── GET: List notebooks for the current user ──
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const classGroupId = searchParams.get('classGroupId');
    const isArchived = searchParams.get('isArchived');

    const userRole = session.user.role;
    const userId = session.user.id;

    // Default schoolId from user session
    const effectiveSchoolId = schoolId || session.user.schoolId;
    if (!effectiveSchoolId) {
      return NextResponse.json([]);
    }

    if (userRole === 'STUDENT') {
      // Students see their own notebooks + public notebooks shared with their classes
      const enrollments = await db.enrollment.findMany({
        where: {
          student: {
            schoolId: effectiveSchoolId,
          },
          // Use the user's enrolled classes — we need to find the student
          // associated with this user. For now, we'll look up via the
          // student's externalId matching the user's id, or we can use
          // a simpler approach: find all class groups where the student
          // is enrolled.
        },
        select: { classGroupId: true },
      });

      // For students, we need to find their enrolled class group IDs.
      // Since the Student model doesn't have a direct userId field,
      // we'll look for students with matching firstName/lastName in the school
      // and then find their enrollments. A more robust approach would be to
      // add a userId field to the Student model, but for now we'll use
      // a pragmatic approach: find all public notebooks for the school
      // that have a classGroupId matching any of the user's class groups.

      // Find student IDs that match the user (by firstName + lastName in the same school)
      const matchingStudents = await db.student.findMany({
        where: {
          schoolId: effectiveSchoolId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          deletedAt: null,
        },
        select: { id: true },
      });

      const studentIds = matchingStudents.map(s => s.id);

      // Get class group IDs where the student is enrolled
      const studentEnrollments = studentIds.length > 0
        ? await db.enrollment.findMany({
            where: {
              studentId: { in: studentIds },
            },
            select: { classGroupId: true },
          })
        : [];

      const enrolledClassGroupIds = studentEnrollments.map(e => e.classGroupId);

      const where: Record<string, unknown> = {
        deletedAt: null,
        schoolId: effectiveSchoolId,
        OR: [
          // Own notebooks
          { ownerId: userId },
          // Public notebooks shared with the student's classes
          ...(enrolledClassGroupIds.length > 0
            ? [{ isPublic: true, classGroupId: { in: enrolledClassGroupIds } }]
            : []),
        ],
      };

      if (subjectId) where.subjectId = subjectId;
      if (classGroupId) where.classGroupId = classGroupId;
      if (isArchived !== null && isArchived !== undefined) {
        where.isArchived = isArchived === 'true';
      }

      const notebooks = await db.notebook.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true, role: true } },
          _count: { select: { pages: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return NextResponse.json(notebooks);
    }

    // Teacher / Admin: show own notebooks
    const where: Record<string, unknown> = {
      ownerId: userId,
      deletedAt: null,
    };

    if (schoolId) where.schoolId = schoolId;
    if (subjectId) where.subjectId = subjectId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (isArchived !== null && isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    }

    if (!schoolId && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    const notebooks = await db.notebook.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error('Notebooks list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new notebook ──
const createNotebookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  notebookType: z
    .enum([
      'lined', 'grid', 'blank', 'dotted', 'music', 'calligraphy',
      // German curriculum types
      'deutschheft', 'matheheft', 'sachbuch', 'musikheft',
      'kunstheft', 'englischheft', 'geschichtsheft', 'religionsheft',
      'sachkundeheft',
    ])
    .default('lined'),
  color: z.string().default('#10b981'),
  icon: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classGroupId: z.string().optional().nullable(),
  isPublic: z.boolean().default(false).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createNotebookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, notebookType, color, icon, subjectId, classGroupId, isPublic } =
      parsed.data;

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'User must belong to a school to create notebooks' },
        { status: 400 }
      );
    }
    if (classGroupId && !(await canAccessClass(session.user, classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role === 'STUDENT' && isPublic) {
      return NextResponse.json({ error: 'Students cannot publish notebooks to a class' }, { status: 403 });
    }

    const ownerType = session.user.role === 'STUDENT' ? 'STUDENT' : 'TEACHER';

    const notebook = await db.notebook.create({
      data: {
        schoolId,
        ownerId: session.user.id,
        ownerType,
        title,
        description,
        notebookType,
        color,
        icon,
        subjectId,
        classGroupId,
        isPublic: isPublic ?? false,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId,
        action: 'CREATE',
        entityType: 'Notebook',
        entityId: notebook.id,
        metadata: JSON.stringify({ title }),
      },
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error('Notebook create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
