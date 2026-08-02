// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Returns detailed academic progress for a child
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden - Parent role required' }, { status: 403 });
    }

    const parentId = session.userId;
    const schoolId = session.user?.schoolId;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId || !schoolId) {
      return NextResponse.json({ error: 'studentId and schoolId are required' }, { status: 400 });
    }

    // Verify parent is linked to this student
    const parentLink = await db.parentStudentLink.findFirst({
      where: { parentId, studentId },
    });
    if (!parentLink) {
      return NextResponse.json({ error: 'You can only view progress for your children' }, { status: 403 });
    }

    // Get all computed grades for the student
    const grades = await db.computedGrade.findMany({
      where: { studentId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        classGroup: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, name: true } },
      },
      orderBy: { computedAt: 'desc' },
    });

    // Group grades by subject
    const subjectGrades: Record<string, {
      subject: { id: string; name: string; code: string | null };
      grades: Array<{
        id: string;
        computedValue: number;
        period: string;
        computedAt: string;
        classGroup: { id: string; name: string };
        schoolYear: { id: string; name: string };
      }>;
      average: number;
      trend: 'up' | 'down' | 'stable';
    }> = {};

    for (const grade of grades) {
      const sid = grade.subjectId;
      if (!subjectGrades[sid]) {
        subjectGrades[sid] = {
          subject: grade.subject,
          grades: [],
          average: 0,
          trend: 'stable',
        };
      }
      subjectGrades[sid].grades.push({
        id: grade.id,
        computedValue: grade.computedValue,
        period: grade.period,
        computedAt: grade.computedAt.toISOString(),
        classGroup: grade.classGroup,
        schoolYear: grade.schoolYear,
      });
    }

    // Calculate averages and trends
    for (const sid of Object.keys(subjectGrades)) {
      const sg = subjectGrades[sid];
      const values = sg.grades.map((g) => g.computedValue);
      sg.average = values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : 0;

      // Trend: compare last two periods
      if (values.length >= 2) {
        const latest = values[0];
        const previous = values[1];
        if (latest > previous + 0.3) sg.trend = 'up';
        else if (latest < previous - 0.3) sg.trend = 'down';
        else sg.trend = 'stable';
      }
    }

    // Class averages for comparison
    const studentEnrollments = await db.enrollment.findMany({
      where: { studentId, endDate: null },
      select: { classGroupId: true },
    });
    const classIds = studentEnrollments.map((e) => e.classGroupId);

    const classAverages: Record<string, number> = {};
    if (classIds.length > 0) {
      const classGrades = await db.computedGrade.findMany({
        where: {
          classGroupId: { in: classIds },
          student: { enrollments: { some: { classGroupId: { in: classIds }, endDate: null } } },
        },
        include: { subject: { select: { id: true } } },
      });

      const bySubject: Record<string, number[]> = {};
      for (const cg of classGrades) {
        const sid = cg.subjectId;
        if (!bySubject[sid]) bySubject[sid] = [];
        bySubject[sid].push(cg.computedValue);
      }
      for (const [sid, vals] of Object.entries(bySubject)) {
        classAverages[sid] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
    }

    // Competency progress data for radar chart
    const learningProgress = await db.learningProgressEntry.findMany({
      where: { studentId },
      include: {
        competency: { select: { id: true, code: true, title: true, subject: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    // Group by subject for radar chart
    const competencyBySubject: Record<string, {
      subject: { id: string; name: string };
      competencies: Array<{
        id: string;
        code: string;
        title: string;
        level: number;
        assessedAt: string;
      }>;
      averageLevel: number;
    }> = {};

    for (const lp of learningProgress) {
      const sid = lp.competency.subject?.id ?? 'unknown';
      if (!competencyBySubject[sid]) {
        competencyBySubject[sid] = {
          subject: lp.competency.subject ?? { id: sid, name: 'Unknown' },
          competencies: [],
          averageLevel: 0,
        };
      }
      // Only keep the latest for each competency
      const existing = competencyBySubject[sid].competencies.find((c) => c.id === lp.competencyId);
      if (!existing) {
        competencyBySubject[sid].competencies.push({
          id: lp.competencyId,
          code: lp.competency.code,
          title: lp.competency.title,
          level: lp.masteryLevelValue,
          assessedAt: lp.date.toISOString(),
        });
      }
    }

    for (const sid of Object.keys(competencyBySubject)) {
      const cs = competencyBySubject[sid];
      const levels = cs.competencies.map((c) => c.level);
      cs.averageLevel = levels.length > 0
        ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
        : 0;
    }

    // Assessment results
    const assessments = await db.assessmentResult.findMany({
      where: {
        studentId,
        assessment: { classGroup: { schoolId } },
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { assessment: { date: 'desc' } },
      take: 20,
    });

    return NextResponse.json({
      subjectGrades: Object.values(subjectGrades),
      classAverages,
      competencyBySubject: Object.values(competencyBySubject),
      assessments: assessments.map((a) => ({
        id: a.id,
        score: a.score,
        maxScore: a.assessment.maxScore,
        grade: a.masteryLevelValue,
        feedback: a.note,
        assessedAt: a.assessment.date.toISOString(),
        assessment: a.assessment,
      })),
    });
  } catch (error) {
    console.error('Child Progress GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
