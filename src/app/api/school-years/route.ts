import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createSchoolYearSchema = z.object({
  schoolId: z.string().min(1),
  label: z.string().min(1),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId query parameter is required' },
        { status: 400 }
      );
    }

    const schoolYears = await db.schoolYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { classGroups: true, enrollments: true },
        },
      },
    });

    return NextResponse.json(schoolYears);
  } catch (error) {
    console.error('SchoolYears GET error:', error);
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
    const parsed = createSchoolYearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schoolYear = await db.schoolYear.create({
      data: parsed.data,
    });

    return NextResponse.json(schoolYear, { status: 201 });
  } catch (error) {
    console.error('SchoolYears POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
