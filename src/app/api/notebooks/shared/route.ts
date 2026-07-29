import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get public notebooks shared by others in the same school ──
// Teachers see other teachers' notebooks; students see teacher notebooks shared with their classes
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      );
    }

    const userRole = session.user.role;

    if (userRole === 'STUDENT') {
      // Students see public notebooks from teachers in their enrolled classes
      const matchingStudents = await db.student.findMany({
        where: {
          schoolId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          deletedAt: null,
        },
        select: { id: true },
      });

      const studentIds = matchingStudents.map(s => s.id);

      const studentEnrollments = studentIds.length > 0
        ? await db.enrollment.findMany({
            where: { studentId: { in: studentIds } },
            select: { classGroupId: true },
          })
        : [];

      const enrolledClassGroupIds = studentEnrollments.map(e => e.classGroupId);

      const sharedNotebooks = await db.notebook.findMany({
        where: {
          schoolId,
          isPublic: true,
          isArchived: false,
          deletedAt: null,
          ownerId: { not: session.user.id },
          ownerType: 'TEACHER',
          ...(enrolledClassGroupIds.length > 0
            ? { classGroupId: { in: enrolledClassGroupIds } }
            : {}),
        },
        include: {
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { pages: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json(sharedNotebooks);
    }

    // Teachers / Admins: see public notebooks from other teachers in the same school
    // Also include student notebooks shared publicly
    const sharedNotebooks = await db.notebook.findMany({
      where: {
        schoolId,
        isPublic: true,
        isArchived: false,
        deletedAt: null,
        ownerId: { not: session.user.id },
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, role: true } },
        _count: { select: { pages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sharedNotebooks);
  } catch (error) {
    console.error('Shared notebooks get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
