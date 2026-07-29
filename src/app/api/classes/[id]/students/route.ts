import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: classGroupId } = await params;

    const enrollments = await db.enrollment.findMany({
      where: {
        classGroupId,
        endDate: null,
        student: { deletedAt: null },
      },
      include: {
        student: true,
        schoolYear: { select: { id: true, label: true } },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    const students = enrollments.map((e) => ({
      ...e.student,
      enrollmentId: e.id,
      schoolYearId: e.schoolYearId,
      schoolYear: e.schoolYear,
      startDate: e.startDate,
    }));

    return NextResponse.json(students);
  } catch (error) {
    console.error('Class students GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: classGroupId } = await params;

    const body = await request.json();
    const schema = z.object({
      studentId: z.string().min(1),
      schoolYearId: z.string().min(1),
      startDate: z
        .string()
        .optional()
        .transform((v) => (v ? new Date(v) : new Date())),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { studentId, schoolYearId, startDate } = parsed.data;

    // Check if already enrolled
    const existing = await db.enrollment.findFirst({
      where: {
        studentId,
        classGroupId,
        endDate: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Student already enrolled in this class' },
        { status: 409 }
      );
    }

    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        classGroupId,
        schoolYearId,
        startDate,
      },
      include: {
        student: true,
        classGroup: true,
        schoolYear: { select: { id: true, label: true } },
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error('Class students POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
