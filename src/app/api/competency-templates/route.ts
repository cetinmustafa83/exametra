import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const masteryLevelSchema = z.object({
  levelValue: z.number().int(),
  label: z.string().min(1),
  description: z.string().optional(),
});

const competencySchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().default(0),
  masteryLevels: z.array(masteryLevelSchema).optional(),
});

const categorySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().default(0),
  color: z.string().optional(),
  competencies: z.array(competencySchema).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']).default('ELEMENTARY'),
  gradeLevelMin: z.number().int().default(1),
  gradeLevelMax: z.number().int().default(4),
  isGlobalTemplate: z.boolean().default(false),
  schoolId: z.string().optional(),
  categories: z.array(categorySchema).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolType = searchParams.get('schoolType');
    const subjectId = searchParams.get('subjectId');
    const gradeLevel = searchParams.get('gradeLevel');
    const schoolId = searchParams.get('schoolId');

    const where: Record<string, unknown> = {};

    if (schoolType) where.schoolType = schoolType;
    if (subjectId) where.subjectId = subjectId;
    if (gradeLevel) {
      const gl = parseInt(gradeLevel, 10);
      if (!isNaN(gl)) {
        where.AND = [
          { gradeLevelMin: { lte: gl } },
          { gradeLevelMax: { gte: gl } },
        ];
      }
    }

    // Show global templates + school-specific ones
    if (schoolId) {
      where.OR = [
        { isGlobalTemplate: true },
        { schoolId },
      ];
    }

    const templates = await db.competencyTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        categories: {
          orderBy: { order: 'asc' },
          include: {
            competencies: {
              orderBy: { order: 'asc' },
              include: {
                masteryLevelDefinitions: { orderBy: { levelValue: 'asc' } },
              },
            },
          },
        },
        _count: {
          select: { classCompetencyAssignments: true },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('CompetencyTemplates GET error:', error);
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
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { categories, ...templateData } = parsed.data;

    const template = await db.competencyTemplate.create({
      data: {
        name: templateData.name,
        description: templateData.description,
        subjectId: templateData.subjectId ?? null,
        schoolType: templateData.schoolType,
        gradeLevelMin: templateData.gradeLevelMin,
        gradeLevelMax: templateData.gradeLevelMax,
        isGlobalTemplate: templateData.isGlobalTemplate,
        schoolId: templateData.schoolId ?? null,
        createdByUserId: session.userId,
        categories: categories
          ? {
              create: categories.map((cat) => ({
                name: cat.name,
                order: cat.order,
                color: cat.color,
                competencies: cat.competencies
                  ? {
                      create: cat.competencies.map((comp) => ({
                        code: comp.code,
                        title: comp.title,
                        description: comp.description,
                        order: comp.order,
                        masteryLevelDefinitions: comp.masteryLevels
                          ? {
                              create: comp.masteryLevels.map((ml) => ({
                                levelValue: ml.levelValue,
                                label: ml.label,
                                description: ml.description,
                              })),
                            }
                          : undefined,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        subject: { select: { id: true, name: true } },
        categories: {
          orderBy: { order: 'asc' },
          include: {
            competencies: {
              orderBy: { order: 'asc' },
              include: {
                masteryLevelDefinitions: { orderBy: { levelValue: 'asc' } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('CompetencyTemplates POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
