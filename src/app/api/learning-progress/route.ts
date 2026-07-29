import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const entrySchema = z.object({
  studentId: z.string().min(1),
  competencyId: z.string().min(1),
  teacherId: z.string().min(1),
  classGroupId: z.string().min(1),
  date: z.string().transform((v) => new Date(v)),
  masteryLevelValue: z.number().int().min(1),
  note: z.string().optional(),
});

const bulkEntrySchema = z.array(entrySchema);

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classGroupId = searchParams.get('classGroupId');
    const competencyId = searchParams.get('competencyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (competencyId) where.competencyId = competencyId;

    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    const entries = await db.learningProgressEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        competency: {
          select: {
            id: true,
            code: true,
            title: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('LearningProgress GET error:', error);
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

    const body = await request.json();

    // Support both single entry and bulk (array) entries
    const isBulk = Array.isArray(body);

    if (isBulk) {
      const parsed = bulkEntrySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const entries = await db.learningProgressEntry.createMany({
        data: parsed.data,
      });

      return NextResponse.json(
        { created: entries.count },
        { status: 201 }
      );
    } else {
      const parsed = entrySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const entry = await db.learningProgressEntry.create({
        data: parsed.data,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          competency: {
            select: { id: true, code: true, title: true },
          },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(entry, { status: 201 });
    }
  } catch (error) {
    console.error('LearningProgress POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
