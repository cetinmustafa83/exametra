import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createLinkSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  schoolId: z.string().min(1),
  relationship: z.enum(['mother', 'father', 'guardian', 'other']).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    // If parentId is provided, get links for that parent
    // If user is PARENT role, they can only see their own links
    let filter: Record<string, unknown> = {};

    if (session.user?.role === 'PARENT') {
      filter.parentId = session.user.id;
    } else if (parentId) {
      // Teachers/admins can query by parentId
      filter.parentId = parentId;
    } else if (session.user?.role === 'TEACHER' || session.user?.role === 'SCHOOL_ADMIN') {
      // Teachers/admins can see all links in their school
      if (session.user?.schoolId) {
        filter.schoolId = session.user.schoolId;
      }
    }

    const links = await db.parentStudentLink.findMany({
      where: filter,
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            externalId: true,
            schoolId: true,
            enrollments: {
              select: {
                classGroup: {
                  select: { id: true, name: true, gradeLevel: true },
                },
              },
            },
          },
        },
        school: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('ParentLinks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only teachers, school admins, or the parent themselves can create links
    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'PARENT'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { parentId, studentId, schoolId, relationship } = parsed.data;

    // Verify parent user has PARENT role
    const parentUser = await db.user.findUnique({ where: { id: parentId } });
    if (!parentUser || parentUser.role !== 'PARENT') {
      return NextResponse.json({ error: 'User must have PARENT role' }, { status: 400 });
    }

    // Verify student exists
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if link already exists
    const existing = await db.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Link already exists' }, { status: 409 });
    }

    // Parents can only create links for themselves
    if (session.user?.role === 'PARENT' && parentId !== session.user.id) {
      return NextResponse.json({ error: 'Parents can only link their own account' }, { status: 403 });
    }

    // School admins can only create links in their school
    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user?.schoolId &&
      schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Cannot create links outside your school' }, { status: 403 });
    }

    const link = await db.parentStudentLink.create({
      data: {
        parentId,
        studentId,
        schoolId,
        relationship: relationship ?? null,
      },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolId: true,
          },
        },
        school: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('ParentLinks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID required' }, { status: 400 });
    }

    const link = await db.parentStudentLink.findUnique({ where: { id: linkId } });
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Only admins, teachers, or the parent themselves can delete
    if (
      session.user?.role !== 'TEACHER' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'SUPER_ADMIN' &&
      (session.user?.role === 'PARENT' && link.parentId !== session.user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.parentStudentLink.delete({ where: { id: linkId } });

    return NextResponse.json({ message: 'Link removed' });
  } catch (error) {
    console.error('ParentLinks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
