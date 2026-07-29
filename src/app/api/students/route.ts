import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createStudentSchema = z.object({
  schoolId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  externalId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classGroupId = searchParams.get('classGroupId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };

    if (schoolId) where.schoolId = schoolId;

    if (classGroupId) {
      where.enrollments = {
        some: { classGroupId, endDate: null },
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { externalId: { contains: search } },
      ];
    }

    const students = await db.student.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        school: { select: { id: true, name: true } },
        enrollments: {
          where: { endDate: null },
          include: {
            classGroup: {
              select: { id: true, name: true, gradeLevel: true },
            },
          },
        },
        _count: {
          select: {
            learningProgressEntries: true,
            assessmentResults: true,
          },
        },
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Students GET error:', error);
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
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const student = await db.student.create({
      data: parsed.data,
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Students POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateSchema = z.object({
      id: z.string().min(1),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      dateOfBirth: z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
      externalId: z.string().nullable().optional(),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const student = await db.student.update({
      where: { id },
      data: updateData,
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Students PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
