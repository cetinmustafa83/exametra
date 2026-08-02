// @ts-nocheck
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
    const groupBy = searchParams.get('groupBy') ?? 'overall'; // overall, subject, class

    const role = session.user?.role;
    const isStudent = role === 'STUDENT';
    const isParent = role === 'PARENT';

    // Build where clause
    const gradeWhere: Record<string, unknown> = {};
    if (classGroupId) gradeWhere.classGroupId = classGroupId;
    if (subjectId) gradeWhere.subjectId = subjectId;
    if (schoolYearId) gradeWhere.schoolYearId = schoolYearId;

    if (schoolId) {
      gradeWhere.classGroup = { schoolId };
    }

    // Role-based scoping
    if (isStudent && session.user?.id) {
      const student = await db.student.findFirst({
        where: { userId: session.user.id, deletedAt: null },
      });
      if (student) gradeWhere.studentId = student.id;
    }

    if (isParent && session.user?.id) {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.user.id },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      gradeWhere.studentId = { in: studentIds };
    }

    // Get all grades with subject and class info
    const grades = await db.computedGrade.findMany({
      where: gradeWhere,
      select: {
        computedValue: true,
        overriddenValue: true,
        subjectId: true,
        classGroupId: true,
        studentId: true,
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    // Grade colors for German 1-6 scale
    const gradeColors: Record<number, string> = {
      1: '#10b981', // emerald
      2: '#22c55e', // green
      3: '#eab308', // yellow
      4: '#f59e0b', // amber
      5: '#f97316', // orange
      6: '#ef4444', // red
    };

    if (groupBy === 'overall') {
      // Overall distribution
      const distribution: Record<number, { count: number; percentage: number; color: string }> = {};
      for (let i = 1; i <= 6; i++) {
        distribution[i] = { count: 0, percentage: 0, color: gradeColors[i] };
      }
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        const rounded = Math.round(val);
        if (rounded >= 1 && rounded <= 6) {
          distribution[rounded].count++;
        }
      });
      const total = grades.length || 1;
      Object.values(distribution).forEach((d) => {
        d.percentage = Math.round((d.count / total) * 10000) / 100;
      });

      // Bell curve data (normal distribution overlay)
      const mean = grades.reduce((s, g) => s + (g.overriddenValue ?? g.computedValue), 0) / (grades.length || 1);
      const variance = grades.reduce((s, g) => {
        const val = g.overriddenValue ?? g.computedValue;
        return s + Math.pow(val - mean, 2);
      }, 0) / (grades.length || 1);
      const stdDev = Math.sqrt(variance);

      const bellCurveData = [];
      for (let x = 0.5; x <= 6.5; x += 0.1) {
        const exponent = -Math.pow(x - mean, 2) / (2 * (stdDev * stdDev || 1));
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI) || 1)) * Math.exp(exponent);
        bellCurveData.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 1000) / 1000 });
      }

      return NextResponse.json({
        type: 'overall',
        distribution: Object.entries(distribution).map(([grade, data]) => ({
          grade: parseInt(grade),
          ...data,
          label: grade === '1' ? 'Sehr gut' : grade === '2' ? 'Gut' : grade === '3' ? 'Befriedigend' : grade === '4' ? 'Ausreichend' : grade === '5' ? 'Mangelhaft' : 'Ungenügend',
        })),
        bellCurve: bellCurveData,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        total: grades.length,
      });
    }

    if (groupBy === 'subject') {
      // Distribution by subject
      const subjectMap: Record<string, { name: string; distribution: Record<number, number> }> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        const rounded = Math.round(val);
        if (!subjectMap[g.subjectId]) {
          subjectMap[g.subjectId] = { name: g.subject.name, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } };
        }
        if (rounded >= 1 && rounded <= 6) {
          subjectMap[g.subjectId].distribution[rounded]++;
        }
      });

      const subjectDistribution = Object.entries(subjectMap).map(([id, data]) => ({
        id,
        name: data.name,
        distribution: data.distribution,
      }));

      return NextResponse.json({
        type: 'subject',
        subjects: subjectDistribution,
        gradeColors,
        total: grades.length,
      });
    }

    if (groupBy === 'class') {
      // Distribution by class
      const classMap: Record<string, { name: string; distribution: Record<number, number> }> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        const rounded = Math.round(val);
        if (!classMap[g.classGroupId]) {
          classMap[g.classGroupId] = { name: g.classGroup.name, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } };
        }
        if (rounded >= 1 && rounded <= 6) {
          classMap[g.classGroupId].distribution[rounded]++;
        }
      });

      const classDistribution = Object.entries(classMap).map(([id, data]) => ({
        id,
        name: data.name,
        distribution: data.distribution,
      }));

      return NextResponse.json({
        type: 'class',
        classes: classDistribution,
        gradeColors,
        total: grades.length,
      });
    }

    return NextResponse.json({ error: 'Invalid groupBy parameter' }, { status: 400 });
  } catch (error) {
    console.error('Grade distribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
