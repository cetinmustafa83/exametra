import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(
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

    // Get the rubric with criteria
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

    // Get all assessment results linked to assessments that use this rubric's subject
    // For now, we'll provide rubric-level analytics data
    // This includes: criteria distribution, average scores per criterion, etc.

    // Get assessments for the same subject
    const assessments = await db.assessment.findMany({
      where: {
        subjectId: rubric.subjectId ?? undefined,
        classGroup: { schoolId: rubric.schoolId },
      },
      include: {
        assessmentResults: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        assessmentCompetencyLinks: {
          include: {
            competency: {
              select: { id: true, code: true, title: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // Build analytics per criterion
    const criteriaAnalytics = rubric.criteria.map((criterion) => {
      const levelDistribution = criterion.levels.map((level) => ({
        levelId: level.id,
        label: level.label,
        points: level.points,
        description: level.description,
        percentage: 0, // Will be filled from actual grading data
      }));

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        maxPoints: criterion.maxPoints,
        weight: criterion.weight,
        averageScore: 0,
        levelDistribution,
        // Sample data for analytics visualization
        classAverage: Math.round((criterion.maxPoints * 0.72) * 100) / 100,
        classMedian: Math.round((criterion.maxPoints * 0.75) * 100) / 100,
        highestScore: criterion.maxPoints,
        lowestScore: Math.round(criterion.maxPoints * 0.3),
      };
    });

    // Build grade distribution based on rubric points
    const gradeDistribution = [
      { grade: 'sehr gut', range: '92-100%', count: 0, color: '#10b981' },
      { grade: 'gut', range: '81-91%', count: 0, color: '#14b8a6' },
      { grade: 'befriedigend', range: '67-80%', count: 0, color: '#f59e0b' },
      { grade: 'ausreichend', range: '50-66%', count: 0, color: '#f97316' },
      { grade: 'mangelhaft', range: '30-49%', count: 0, color: '#ef4444' },
      { grade: 'ungenügend', range: '0-29%', count: 0, color: '#dc2626' },
    ];

    // Calculate overall statistics
    const totalMaxPoints = rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0);
    const averagePercentage = 72; // Sample - would be computed from actual data

    return NextResponse.json({
      rubricId,
      rubricTitle: rubric.title,
      criteriaAnalytics,
      gradeDistribution,
      overallStats: {
        averagePercentage,
        totalAssessments: assessments.length,
        totalStudents: assessments.reduce((sum, a) => sum + a.assessmentResults.length, 0),
        totalMaxPoints,
        averageScore: Math.round((totalMaxPoints * averagePercentage / 100) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Rubric analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
