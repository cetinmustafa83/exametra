import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const relationshipEnum = z.enum(['parent', 'guardian', 'emergency']);
const preferredContactEnum = z.enum(['email', 'phone', 'both']);

const createParentContactSchema = z.object({
  studentId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship: relationshipEnum.optional(),
  preferredContact: preferredContactEnum.optional(),
  preferredLanguage: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const search = searchParams.get('search');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (studentId) {
      where.studentId = studentId;
    } else if (session.user?.schoolId) {
      // Restrict to students in this school
      where.student = { schoolId: session.user.schoolId };
    }

    if (search) {
      const s = search.toLowerCase();
      where.OR = [
        { firstName: { contains: s } },
        { lastName: { contains: s } },
        { email: { contains: s } },
        { student: { firstName: { contains: s } } },
        { student: { lastName: { contains: s } } },
      ];
    }

    const contacts = await db.parentContact.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollments: {
              where: { endDate: null },
              select: {
                classGroup: { select: { id: true, name: true, gradeLevel: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('ParentContacts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createParentContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { studentId, ...rest } = parsed.data;

    // Verify student exists and belongs to user's school
    const student = await db.student.findUnique({
      where: { id: studentId, deletedAt: null },
      select: { id: true, schoolId: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check uniqueness for (studentId, email) if email provided
    if (rest.email) {
      const existing = await db.parentContact.findUnique({
        where: { studentId_email: { studentId, email: rest.email } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'A contact with this email already exists for this student' },
          { status: 409 }
        );
      }
    }

    const contact = await db.parentContact.create({
      data: {
        studentId,
        firstName: rest.firstName,
        lastName: rest.lastName,
        email: rest.email ?? null,
        phone: rest.phone ?? null,
        relationship: rest.relationship ?? 'parent',
        preferredContact: rest.preferredContact ?? 'email',
        preferredLanguage: rest.preferredLanguage ?? 'de',
        notes: rest.notes ?? null,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollments: {
              where: { endDate: null },
              select: {
                classGroup: { select: { id: true, name: true, gradeLevel: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: student.schoolId,
        action: 'CREATE',
        entityType: 'ParentContact',
        entityId: contact.id,
        metadata: JSON.stringify({
          studentId,
          firstName: rest.firstName,
          lastName: rest.lastName,
        }),
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('ParentContacts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
