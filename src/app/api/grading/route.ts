import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const weightRuleSchema = z.object({
  sourceType: z.enum(['LEARNING_PROGRESS', 'ASSESSMENT']),
  targetRef: z.string().optional(),
  weightPercent: z.number().min(0).max(100).default(50.0),
});

const createSchemeSchema = z.object({
  classGroupId: z.string().optional(),
  subjectId: z.string().optional(),
  schoolId: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['NUMERIC_GRADE', 'VERBAL_FEEDBACK', 'COMBINED']).default('NUMERIC_GRADE'),
  scaleDefinition: z.string(), // JSON string
  weightRules: z.array(weightRuleSchema).optional(),
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
    const schoolId = searchParams.get('schoolId');
    const computeGrades = searchParams.get('computeGrades') === 'true';

    const where: Record<string, unknown> = {};
    if (classGroupId) where.classGroupId = classGroupId;
    if (subjectId) where.subjectId = subjectId;
    if (schoolId) where.schoolId = schoolId;

    const schemes = await db.gradingScheme.findMany({
      where,
      include: {
        gradingWeightRules: { orderBy: { weightPercent: 'desc' } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (computeGrades && classGroupId && subjectId) {
      // Compute grades based on weight rules
      const schoolYearId = searchParams.get('schoolYearId');
      if (!schoolYearId) {
        return NextResponse.json(
          { error: 'schoolYearId is required for grade computation' },
          { status: 400 }
        );
      }

      // Get enrolled students
      const enrollments = await db.enrollment.findMany({
        where: { classGroupId, endDate: null },
        select: { studentId: true },
      });

      const studentIds = enrollments.map((e) => e.studentId);
      const computedGrades: Array<{
        studentId: string;
        computedValue: number;
        breakdown: Array<{ source: string; weight: number; value: number }>;
      }> = [];

      for (const scheme of schemes) {
        const rules = scheme.gradingWeightRules;
        if (rules.length === 0) continue;

        const scale = JSON.parse(scheme.scaleDefinition);
        const maxLevel = scale.max ?? 4;

        for (const studentId of studentIds) {
          let totalWeightedValue = 0;
          let totalWeight = 0;
          const breakdown: Array<{ source: string; weight: number; value: number }> = [];

          for (const rule of rules) {
            let value = 0;
            if (rule.sourceType === 'LEARNING_PROGRESS') {
              // Average mastery level from progress entries
              const whereEntry: Record<string, unknown> = {
                studentId,
                classGroupId,
              };
              if (rule.targetRef) {
                // targetRef could be a categoryId or competencyId
                whereEntry.competency = {
                  OR: [
                    { id: rule.targetRef },
                    { categoryId: rule.targetRef },
                  ],
                };
              }

              const entries = await db.learningProgressEntry.findMany({
                where: whereEntry,
                orderBy: { date: 'desc' },
                select: { masteryLevelValue: true, competencyId: true },
              });

              // Get latest per competency
              const latestMap = new Map<string, number>();
              for (const entry of entries) {
                if (!latestMap.has(entry.competencyId)) {
                  latestMap.set(entry.competencyId, entry.masteryLevelValue);
                }
              }

              const avg =
                latestMap.size > 0
                  ? Array.from(latestMap.values()).reduce((a, b) => a + b, 0) /
                    latestMap.size
                  : 0;

              value = avg / maxLevel; // Normalize to 0-1
            } else if (rule.sourceType === 'ASSESSMENT') {
              const whereResult: Record<string, unknown> = {
                studentId,
              };
              if (rule.targetRef) {
                whereResult.assessmentId = rule.targetRef;
              }

              const results = await db.assessmentResult.findMany({
                where: whereResult,
                include: {
                  assessment: { select: { maxScore: true, weight: true } },
                },
              });

              if (results.length > 0) {
                const totalScore = results.reduce((sum, r) => {
                  if (r.score !== null && r.assessment.maxScore) {
                    return sum + (r.score / r.assessment.maxScore) * r.assessment.weight;
                  }
                  return sum;
                }, 0);
                const totalWeight = results.reduce(
                  (sum, r) => sum + (r.assessment.weight ?? 1),
                  0
                );
                value = totalWeight > 0 ? totalScore / totalWeight : 0;
              }
            }

            totalWeightedValue += value * (rule.weightPercent / 100);
            totalWeight += rule.weightPercent / 100;
            breakdown.push({
              source: rule.sourceType,
              weight: rule.weightPercent,
              value: Math.round(value * 1000) / 1000,
            });
          }

          const computedValue =
            totalWeight > 0
              ? Math.round((totalWeightedValue / totalWeight) * maxLevel * 100) / 100
              : 0;

          computedGrades.push({
            studentId,
            computedValue,
            breakdown,
          });

          // Store computed grade in DB
          await db.computedGrade.upsert({
            where: {
              id: `${studentId}_${subjectId}_${classGroupId}_${schoolYearId}_${scheme.id}`,
            },
            update: {
              computedValue,
              computedAt: new Date(),
            },
            create: {
              id: `${studentId}_${subjectId}_${classGroupId}_${schoolYearId}_${scheme.id}`,
              studentId,
              subjectId: subjectId!,
              classGroupId: classGroupId!,
              schoolYearId: schoolYearId!,
              period: 'Semester 1',
              computedValue,
            },
          });
        }
      }

      return NextResponse.json({ schemes, computedGrades });
    }

    return NextResponse.json(schemes);
  } catch (error) {
    console.error('Grading GET error:', error);
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
    const parsed = createSchemeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { weightRules, ...schemeData } = parsed.data;

    const scheme = await db.gradingScheme.create({
      data: {
        classGroupId: schemeData.classGroupId ?? null,
        subjectId: schemeData.subjectId ?? null,
        schoolId: schemeData.schoolId ?? null,
        name: schemeData.name,
        type: schemeData.type,
        scaleDefinition: schemeData.scaleDefinition,
        gradingWeightRules: weightRules
          ? {
              create: weightRules.map((rule) => ({
                sourceType: rule.sourceType,
                targetRef: rule.targetRef ?? null,
                weightPercent: rule.weightPercent,
              })),
            }
          : undefined,
      },
      include: {
        gradingWeightRules: true,
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(scheme, { status: 201 });
  } catch (error) {
    console.error('Grading POST error:', error);
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

    // Grade override path
    if (body.studentId && body.overriddenValue !== undefined) {
      const overrideSchema = z.object({
        studentId: z.string().min(1),
        subjectId: z.string().min(1),
        classGroupId: z.string().min(1),
        schoolYearId: z.string().min(1),
        overriddenValue: z.number(),
        overrideReason: z.string().min(1),
      });

      const parsed = overrideSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { studentId, subjectId, classGroupId, schoolYearId, overriddenValue, overrideReason } = parsed.data;

      // Find existing computed grade
      const existing = await db.computedGrade.findFirst({
        where: { studentId, subjectId, classGroupId, schoolYearId },
      });

      if (existing) {
        await db.computedGrade.update({
          where: { id: existing.id },
          data: { overriddenValue, overrideReason, isFinalized: true },
        });
      } else {
        await db.computedGrade.create({
          data: {
            id: `${studentId}_${subjectId}_${classGroupId}_${schoolYearId}_override`,
            studentId,
            subjectId,
            classGroupId,
            schoolYearId,
            period: 'Semester 1',
            computedValue: overriddenValue,
            overriddenValue,
            overrideReason,
            isFinalized: true,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // Scheme update path
    const updateSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      type: z.enum(['NUMERIC_GRADE', 'VERBAL_FEEDBACK', 'COMBINED']).optional(),
      scaleDefinition: z.string().optional(),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const scheme = await db.gradingScheme.update({
      where: { id },
      data: updateData,
      include: {
        gradingWeightRules: true,
      },
    });

    return NextResponse.json(scheme);
  } catch (error) {
    console.error('Grading PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
