import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass, canAccessStudent } from '@/lib/access-policy';

const resultSchema = z.object({
  studentId: z.string().min(1),
  score: z.number().nullable().optional(),
  masteryLevelValue: z.number().int().nullable().optional(),
  note: z.string().optional(),
});

const bulkResultSchema = z.array(resultSchema);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, select: { classGroupId: true } });
    if (!assessment || !session.user || !(await canAccessClass(session.user, assessment.classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = await db.assessmentResult.findMany({
      where: { assessmentId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessment: {
          select: { id: true, title: true, maxScore: true },
        },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Assessment results GET error:', error);
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

    const { id: assessmentId } = await params;
    const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, select: { classGroupId: true } });
    if (!assessment || !session.user || !(await canAccessClass(session.user, assessment.classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const isBulk = Array.isArray(body);

    if (isBulk) {
      const parsed = bulkResultSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      // Upsert each result (assessmentId + studentId is unique)
      const results: Array<{ id: string; studentId: string; score: number | null; masteryLevelValue: number | null; note: string | null; assessmentId: string }> = [];
      for (const item of parsed.data) {
        if (!(await canAccessStudent(session.user!, item.studentId))) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const result = await db.assessmentResult.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId: item.studentId,
            },
          },
          update: {
            score: item.score ?? null,
            masteryLevelValue: item.masteryLevelValue ?? null,
            note: item.note ?? null,
          },
          create: {
            assessmentId,
            studentId: item.studentId,
            score: item.score ?? null,
            masteryLevelValue: item.masteryLevelValue ?? null,
            note: item.note ?? null,
          },
        });
        results.push(result);
      }

      return NextResponse.json(
        { created: results.length },
        { status: 201 }
      );
    } else {
      const parsed = resultSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }
      if (!(await canAccessStudent(session.user!, parsed.data.studentId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = await db.assessmentResult.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId,
            studentId: parsed.data.studentId,
          },
        },
        update: {
          score: parsed.data.score ?? null,
          masteryLevelValue: parsed.data.masteryLevelValue ?? null,
          note: parsed.data.note ?? null,
        },
        create: {
          assessmentId,
          studentId: parsed.data.studentId,
          score: parsed.data.score ?? null,
          masteryLevelValue: parsed.data.masteryLevelValue ?? null,
          note: parsed.data.note ?? null,
        },
      });

      return NextResponse.json(result, { status: 201 });
    }
  } catch (error) {
    console.error('Assessment results POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
