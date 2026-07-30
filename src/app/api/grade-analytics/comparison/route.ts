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
    const schoolYearId = searchParams.get('schoolYearId');
    const compareType = searchParams.get('compareType') ?? 'class'; // class, subject, teacher

    const role = session.user?.role;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';

    // Only admins can do teacher comparison
    if (compareType === 'teacher' && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build where clause
    const gradeWhere: Record<string, unknown> = {};
    if (schoolYearId) gradeWhere.schoolYearId = schoolYearId;
    if (schoolId) {
      gradeWhere.classGroup = { schoolId };
    }

    const grades = await db.computedGrade.findMany({
      where: gradeWhere,
      select: {
        computedValue: true,
        overriddenValue: true,
        subjectId: true,
        classGroupId: true,
        studentId: true,
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    if (compareType === 'class') {
      // Class comparison
      const classMap: Record<string, {
        name: string;
        gradeLevel: number;
        grades: number[];
        average: number;
        median: number;
        stdDev: number;
        gradeCount: number;
      }> = {};

      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!classMap[g.classGroupId]) {
          classMap[g.classGroupId] = {
            name: g.classGroup.name,
            gradeLevel: g.classGroup.gradeLevel,
            grades: [],
            average: 0,
            median: 0,
            stdDev: 0,
            gradeCount: 0,
          };
        }
        classMap[g.classGroupId].grades.push(val);
      });

      // Calculate statistics
      Object.values(classMap).forEach((c) => {
        c.grades.sort((a, b) => a - b);
        c.gradeCount = c.grades.length;
        c.average = c.grades.length > 0 ? Math.round((c.grades.reduce((s, v) => s + v, 0) / c.grades.length) * 100) / 100 : 0;

        // Median
        const mid = Math.floor(c.grades.length / 2);
        c.median = c.grades.length > 0
          ? c.grades.length % 2 !== 0
            ? c.grades[mid]
            : Math.round(((c.grades[mid - 1] + c.grades[mid]) / 2) * 100) / 100
          : 0;

        // Standard deviation
        const variance = c.grades.length > 0
          ? c.grades.reduce((s, v) => s + Math.pow(v - c.average, 2), 0) / c.grades.length
          : 0;
        c.stdDev = Math.round(Math.sqrt(variance) * 100) / 100;
      });

      // Class ranking (anonymized)
      const classRanking = Object.entries(classMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.average - b.average)
        .map((c, idx) => ({
          ...c,
          rank: idx + 1,
          anonymizedName: `Class ${String.fromCharCode(65 + idx)}`, // A, B, C, ...
        }));

      // Subject comparison across classes
      const subjectByClass: Record<string, Record<string, { total: number; count: number; name: string }>> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!subjectByClass[g.subjectId]) {
          subjectByClass[g.subjectId] = {};
        }
        if (!subjectByClass[g.subjectId][g.classGroupId]) {
          subjectByClass[g.subjectId][g.classGroupId] = {
            total: 0,
            count: 0,
            name: g.classGroup.name,
          };
        }
        subjectByClass[g.subjectId][g.classGroupId].total += val;
        subjectByClass[g.subjectId][g.classGroupId].count += 1;
      });

      // Get subject names
      const subjects = await db.subject.findMany({
        where: schoolId ? { schoolId } : {},
        select: { id: true, name: true },
      });
      const subjectNameMap: Record<string, string> = {};
      subjects.forEach((s) => { subjectNameMap[s.id] = s.name; });

      const subjectComparison = Object.entries(subjectByClass).map(([subjectId, classData]) => ({
        subjectId,
        subjectName: subjectNameMap[subjectId] || subjectId,
        classes: Object.entries(classData).map(([classId, data]) => ({
          classId,
          className: data.name,
          average: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
          count: data.count,
        })),
      }));

      return NextResponse.json({
        type: 'class',
        classRanking,
        subjectComparison,
        total: grades.length,
      });
    }

    if (compareType === 'subject') {
      // Subject comparison
      const subjectMap: Record<string, {
        name: string;
        grades: number[];
        average: number;
        variance: number;
        gradeCount: number;
      }> = {};

      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!subjectMap[g.subjectId]) {
          subjectMap[g.subjectId] = {
            name: g.subject.name,
            grades: [],
            average: 0,
            variance: 0,
            gradeCount: 0,
          };
        }
        subjectMap[g.subjectId].grades.push(val);
      });

      Object.values(subjectMap).forEach((s) => {
        s.gradeCount = s.grades.length;
        s.average = s.grades.length > 0 ? Math.round((s.grades.reduce((sum, v) => sum + v, 0) / s.grades.length) * 100) / 100 : 0;
        const variance = s.grades.length > 0
          ? s.grades.reduce((sum, v) => sum + Math.pow(v - s.average, 2), 0) / s.grades.length
          : 0;
        s.variance = Math.round(variance * 100) / 100;
      });

      // Cross-subject correlation
      const subjectIds = Object.keys(subjectMap);
      const studentSubjectGrades: Record<string, Record<string, number[]>> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!studentSubjectGrades[g.studentId]) {
          studentSubjectGrades[g.studentId] = {};
        }
        if (!studentSubjectGrades[g.studentId][g.subjectId]) {
          studentSubjectGrades[g.studentId][g.subjectId] = [];
        }
        studentSubjectGrades[g.studentId][g.subjectId].push(val);
      });

      // Calculate correlation matrix
      const correlationMatrix: Array<{
        subject1: string;
        subject2: string;
        name1: string;
        name2: string;
        correlation: number;
      }> = [];

      for (let i = 0; i < subjectIds.length; i++) {
        for (let j = i; j < subjectIds.length; j++) {
          const s1 = subjectIds[i];
          const s2 = subjectIds[j];
          const pairs: Array<{ x: number; y: number }> = [];

          Object.entries(studentSubjectGrades).forEach(([, subjects]) => {
            const g1 = subjects[s1];
            const g2 = subjects[s2];
            if (g1 && g2 && g1.length > 0 && g2.length > 0) {
              pairs.push({
                x: g1.reduce((a, b) => a + b, 0) / g1.length,
                y: g2.reduce((a, b) => a + b, 0) / g2.length,
              });
            }
          });

          if (pairs.length >= 3) {
            const n = pairs.length;
            const sumX = pairs.reduce((s, p) => s + p.x, 0);
            const sumY = pairs.reduce((s, p) => s + p.y, 0);
            const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
            const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
            const sumY2 = pairs.reduce((s, p) => s + p.y * p.y, 0);

            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            const correlation = denominator !== 0 ? Math.round((numerator / denominator) * 100) / 100 : 0;

            correlationMatrix.push({
              subject1: s1,
              subject2: s2,
              name1: subjectMap[s1].name,
              name2: subjectMap[s2].name,
              correlation,
            });
          }
        }
      }

      // Subject difficulty ranking
      const subjectRanking = Object.entries(subjectMap)
        .map(([id, data]) => ({
          id,
          name: data.name,
          average: data.average,
          variance: data.variance,
          gradeCount: data.gradeCount,
          difficulty: data.average <= 2 ? 'easy' : data.average <= 3 ? 'moderate' : data.average <= 4 ? 'challenging' : 'hard',
        }))
        .sort((a, b) => b.average - a.average);

      // Subject recommendations
      const recommendations = subjectRanking.map((s) => {
        const recs: string[] = [];
        if (s.average >= 4.5) {
          recs.push('Consider additional support materials and tutoring');
          recs.push('Review curriculum difficulty and pacing');
        } else if (s.average >= 3.5) {
          recs.push('Monitor student progress closely');
          recs.push('Consider differentiated instruction');
        } else {
          recs.push('Performance is on track');
          recs.push('Continue current teaching approach');
        }
        if (s.variance > 1.5) {
          recs.push('High variance suggests need for differentiated instruction');
        }
        return { subjectId: s.id, subjectName: s.name, recommendations: recs };
      });

      return NextResponse.json({
        type: 'subject',
        subjectRanking,
        correlationMatrix,
        recommendations,
        total: grades.length,
      });
    }

    if (compareType === 'teacher') {
      // Teacher comparison (admin only)
      if (!isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const teacherClasses = await db.classGroupTeacher.findMany({
        where: schoolId ? { classGroup: { schoolId } } : {},
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          classGroup: { select: { id: true, name: true } },
        },
      });

      const teacherMap: Record<string, {
        name: string;
        classIds: string[];
        grades: number[];
        average: number;
        classCount: number;
        gradeCount: number;
      }> = {};

      teacherClasses.forEach((tc) => {
        if (!teacherMap[tc.userId]) {
          teacherMap[tc.userId] = {
            name: `${tc.user.firstName} ${tc.user.lastName}`,
            classIds: [],
            grades: [],
            average: 0,
            classCount: 0,
            gradeCount: 0,
          };
        }
        if (!teacherMap[tc.userId].classIds.includes(tc.classGroup.id)) {
          teacherMap[tc.userId].classIds.push(tc.classGroup.id);
        }
      });

      // Assign grades to teachers based on class
      grades.forEach((g) => {
        Object.entries(teacherMap).forEach(([, teacher]) => {
          if (teacher.classIds.includes(g.classGroupId)) {
            teacher.grades.push(g.overriddenValue ?? g.computedValue);
          }
        });
      });

      // Calculate teacher stats
      Object.values(teacherMap).forEach((t) => {
        t.gradeCount = t.grades.length;
        t.classCount = t.classIds.length;
        t.average = t.grades.length > 0 ? Math.round((t.grades.reduce((s, v) => s + v, 0) / t.grades.length) * 100) / 100 : 0;
      });

      const teacherRanking = Object.entries(teacherMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.average - b.average);

      return NextResponse.json({
        type: 'teacher',
        teacherRanking,
        total: grades.length,
      });
    }

    return NextResponse.json({ error: 'Invalid compareType parameter' }, { status: 400 });
  } catch (error) {
    console.error('Grade comparison error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
