import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

const gradeSchema = z.object({
  studentId: z.string().min(1),
  scores: z.array(z.object({
    criterionId: z.string().min(1),
    levelId: z.string().min(1),
    points: z.number().min(0),
  })),
  note: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: rubricId } = await params;
    const body = await request.json();
    const parsed = gradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { studentId, scores, note } = parsed.data;

    // Verify rubric exists
    const rubric = await db.rubric.findUnique({
      where: { id: rubricId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!rubric) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    // Calculate weighted score
    let totalWeightedPoints = 0;
    let totalWeight = 0;

    for (const criterion of rubric.criteria) {
      const score = scores.find((s) => s.criterionId === criterion.id);
      if (score) {
        const weight = criterion.weight;
        const maxPoints = criterion.maxPoints;
        const earnedPoints = Math.min(score.points, maxPoints);
        const percentage = maxPoints > 0 ? earnedPoints / maxPoints : 0;
        totalWeightedPoints += percentage * weight;
        totalWeight += weight;
      }
    }

    // Calculate final grade as percentage of maxPoints
    const overallPercentage = totalWeight > 0 ? totalWeightedPoints / totalWeight : 0;
    const finalScore = Math.round(overallPercentage * rubric.maxPoints * 100) / 100;

    // Map to a grade (1-6 scale, German system)
    let grade: number;
    if (overallPercentage >= 0.92) grade = 1;
    else if (overallPercentage >= 0.81) grade = 2;
    else if (overallPercentage >= 0.67) grade = 3;
    else if (overallPercentage >= 0.50) grade = 4;
    else if (overallPercentage >= 0.30) grade = 5;
    else grade = 6;

    const gradeLabels: Record<number, string> = {
      1: 'sehr gut',
      2: 'gut',
      3: 'befriedigend',
      4: 'ausreichend',
      5: 'mangelhaft',
      6: 'ungenügend',
    };

    // Per-criterion breakdown
    const criterionBreakdown = rubric.criteria.map((c) => {
      const score = scores.find((s) => s.criterionId === c.id);
      const selectedLevel = score
        ? c.levels.find((l) => l.id === score.levelId)
        : null;
      return {
        criterionId: c.id,
        criterionName: c.name,
        maxPoints: c.maxPoints,
        earnedPoints: score?.points ?? 0,
        selectedLevel: selectedLevel
          ? { id: selectedLevel.id, label: selectedLevel.label, description: selectedLevel.description }
          : null,
        percentage: c.maxPoints > 0 ? Math.round(((score?.points ?? 0) / c.maxPoints) * 100) : 0,
      };
    });

    return NextResponse.json({
      rubricId,
      studentId,
      scores,
      note,
      finalScore,
      maxPoints: rubric.maxPoints,
      overallPercentage: Math.round(overallPercentage * 100),
      grade,
      gradeLabel: gradeLabels[grade],
      criterionBreakdown,
    });
  } catch (error) {
    console.error('Rubric grade POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
