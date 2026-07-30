import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');
    const schoolYearId = searchParams.get('schoolYearId');
    const studentId = searchParams.get('studentId');

    const role = session.user?.role;
    const isStudent = role === 'STUDENT';
    const isParent = role === 'PARENT';

    // Build where clause for assessments
    const assessmentWhere: Record<string, unknown> = {};
    if (classGroupId) assessmentWhere.classGroupId = classGroupId;
    if (subjectId) assessmentWhere.subjectId = subjectId;

    if (schoolId) {
      assessmentWhere.classGroup = { schoolId };
    }

    // Get assessments with results over time
    const assessments = await db.assessment.findMany({
      where: assessmentWhere,
      select: {
        id: true,
        title: true,
        date: true,
        type: true,
        subjectId: true,
        classGroupId: true,
        maxScore: true,
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        assessmentResults: {
          select: {
            studentId: true,
            score: true,
            masteryLevelValue: true,
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          ...(studentId ? { where: { studentId } } : {}),
        },
      },
      orderBy: { date: 'asc' },
    });

    // Role-based scoping for student/parent
    let filteredAssessments = assessments;
    if (isStudent && session.user?.id) {
      const student = await db.student.findFirst({
        where: { userId: session.user.id, deletedAt: null },
      });
      if (student) {
        filteredAssessments = assessments.map((a) => ({
          ...a,
          assessmentResults: a.assessmentResults.filter((r) => r.studentId === student.id),
        }));
      }
    }

    if (isParent && session.user?.id) {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.user.id },
        select: { studentId: true },
      });
      const childIds = parentLinks.map((l) => l.studentId);
      filteredAssessments = assessments.map((a) => ({
        ...a,
        assessmentResults: a.assessmentResults.filter((r) => childIds.includes(r.studentId)),
      }));
    }

    // Build trend data by month
    const monthMap: Record<string, { date: string; average: number; count: number; grade1: number; grade2: number; grade3: number; grade4: number; grade5: number; grade6: number }> = {};

    filteredAssessments.forEach((a) => {
      const monthKey = a.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { date: monthKey, average: 0, count: 0, grade1: 0, grade2: 0, grade3: 0, grade4: 0, grade5: 0, grade6: 0 };
      }
      a.assessmentResults.forEach((r) => {
        if (r.score !== null && a.maxScore) {
          // Convert score to German grade (1-6 scale)
          const percentage = r.score / a.maxScore;
          let grade: number;
          if (percentage >= 0.92) grade = 1;
          else if (percentage >= 0.81) grade = 2;
          else if (percentage >= 0.67) grade = 3;
          else if (percentage >= 0.50) grade = 4;
          else if (percentage >= 0.30) grade = 5;
          else grade = 6;

          monthMap[monthKey].count++;
          monthMap[monthKey].average += grade;
          if (grade === 1) monthMap[monthKey].grade1++;
          else if (grade === 2) monthMap[monthKey].grade2++;
          else if (grade === 3) monthMap[monthKey].grade3++;
          else if (grade === 4) monthMap[monthKey].grade4++;
          else if (grade === 5) monthMap[monthKey].grade5++;
          else monthMap[monthKey].grade6++;
        }
      });
    });

    // Calculate averages
    Object.values(monthMap).forEach((m) => {
      m.average = m.count > 0 ? Math.round((m.average / m.count) * 100) / 100 : 0;
    });

    const trendData = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date));

    // Student trajectory data
    const studentTrajectories: Record<string, { name: string; data: Array<{ date: string; grade: number }> }> = {};
    filteredAssessments.forEach((a) => {
      const monthKey = a.date.toISOString().substring(0, 7);
      a.assessmentResults.forEach((r) => {
        if (r.score !== null && a.maxScore) {
          const percentage = r.score / a.maxScore;
          let grade: number;
          if (percentage >= 0.92) grade = 1;
          else if (percentage >= 0.81) grade = 2;
          else if (percentage >= 0.67) grade = 3;
          else if (percentage >= 0.50) grade = 4;
          else if (percentage >= 0.30) grade = 5;
          else grade = 6;

          if (!studentTrajectories[r.studentId]) {
            studentTrajectories[r.studentId] = {
              name: `${r.student.firstName} ${r.student.lastName}`,
              data: [],
            };
          }
          // Check if we already have data for this month
          const existing = studentTrajectories[r.studentId].data.find((d) => d.date === monthKey);
          if (!existing) {
            studentTrajectories[r.studentId].data.push({ date: monthKey, grade });
          }
        }
      });
    });

    // Sort trajectory data by date
    Object.values(studentTrajectories).forEach((t) => {
      t.data.sort((a, b) => a.date.localeCompare(b.date));
    });

    // Improvement/regression detection
    const studentImprovements: Array<{
      studentId: string;
      name: string;
      trend: 'improving' | 'stable' | 'regressing';
      firstGrade: number;
      lastGrade: number;
      change: number;
    }> = [];

    Object.entries(studentTrajectories).forEach(([id, data]) => {
      if (data.data.length >= 2) {
        const firstGrade = data.data[0].grade;
        const lastGrade = data.data[data.data.length - 1].grade;
        const change = firstGrade - lastGrade; // Negative = regressing (grade went up), Positive = improving
        let trend: 'improving' | 'stable' | 'regressing' = 'stable';
        if (change >= 0.5) trend = 'improving';
        else if (change <= -0.5) trend = 'regressing';

        studentImprovements.push({
          studentId: id,
          name: data.name,
          trend,
          firstGrade,
          lastGrade,
          change: Math.round(change * 100) / 100,
        });
      }
    });

    // Percentile calculation
    const allStudentAvgs = Object.entries(studentTrajectories).map(([id, data]) => {
      const avg = data.data.length > 0 ? data.data.reduce((s, d) => s + d.grade, 0) / data.data.length : 0;
      return { id, name: data.name, average: avg };
    }).sort((a, b) => a.average - b.average);

    const percentileData = allStudentAvgs.map((s, idx) => ({
      ...s,
      percentile: Math.round((idx / Math.max(allStudentAvgs.length - 1, 1)) * 100),
    }));

    return NextResponse.json({
      trendData,
      studentTrajectories: Object.entries(studentTrajectories).map(([id, data]) => ({
        id,
        ...data,
      })),
      studentImprovements,
      percentileData,
      totalAssessments: filteredAssessments.length,
    });
  } catch (error) {
    console.error('Grade trends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
