import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const competencyLinkSchema = z.object({
  competencyId: z.string().min(1),
  weight: z.number().default(1.0),
});

const createAssessmentSchema = z.object({
  classGroupId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().transform((v) => new Date(v)),
  type: z.enum(['TEST', 'ORAL', 'PROJECT', 'HOMEWORK', 'OTHER']).default('TEST'),
  maxScore: z.number().nullable().optional(),
  weight: z.number().default(1.0),
  competencyLinks: z.array(competencyLinkSchema).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');

    const where: Record<string, unknown> = {};
    if (classGroupId) where.classGroupId = classGroupId;
    if (subjectId) where.subjectId = subjectId;

    const assessments = await db.assessment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        assessmentCompetencyLinks: {
          include: {
            competency: {
              select: { id: true, code: true, title: true },
            },
          },
        },
        _count: {
          select: { assessmentResults: true },
        },
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Assessments GET error:', error);
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
    const parsed = createAssessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { competencyLinks, ...assessmentData } = parsed.data;

    const assessment = await db.assessment.create({
      data: {
        classGroupId: assessmentData.classGroupId,
        subjectId: assessmentData.subjectId,
        teacherId: assessmentData.teacherId,
        title: assessmentData.title,
        date: assessmentData.date,
        type: assessmentData.type,
        maxScore: assessmentData.maxScore ?? null,
        weight: assessmentData.weight,
        assessmentCompetencyLinks: competencyLinks
          ? {
              create: competencyLinks.map((link) => ({
                competencyId: link.competencyId,
                weight: link.weight,
              })),
            }
          : undefined,
      },
      include: {
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        assessmentCompetencyLinks: {
          include: {
            competency: { select: { id: true, code: true, title: true } },
          },
        },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Assessments POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
