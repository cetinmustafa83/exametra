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

    const role = session.user?.role;
    const isStudent = role === 'STUDENT';
    const isParent = role === 'PARENT';

    // Build where clause for ComputedGrade
    const gradeWhere: Record<string, unknown> = {};
    if (classGroupId) gradeWhere.classGroupId = classGroupId;
    if (subjectId) gradeWhere.subjectId = subjectId;
    if (schoolYearId) gradeWhere.schoolYearId = schoolYearId;

    // Scope by school
    if (schoolId) {
      const classWhere: Record<string, unknown> = { schoolId };
      gradeWhere.classGroup = { schoolId };
      if (Object.keys(classWhere).length > 0) {
        gradeWhere.classGroup = classWhere;
      }
    }

    // Role-based scoping
    if (isStudent && session.user?.id) {
      const student = await db.student.findFirst({
        where: { userId: session.user.id, deletedAt: null },
      });
      if (student) {
        gradeWhere.studentId = student.id;
      }
    }

    if (isParent && session.user?.id) {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.user.id },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      gradeWhere.studentId = { in: studentIds };
    }

    // Get total grades count
    const totalGrades = await db.computedGrade.count({ where: gradeWhere });

    // Get average grade
    const gradeAgg = await db.computedGrade.aggregate({
      where: gradeWhere,
      _avg: { computedValue: true },
      _min: { computedValue: true },
      _max: { computedValue: true },
    });

    // Get grade distribution (1-6 scale)
    const allGrades = await db.computedGrade.findMany({
      where: gradeWhere,
      select: {
        computedValue: true,
        overriddenValue: true,
        subjectId: true,
        classGroupId: true,
        studentId: true,
        period: true,
        isFinalized: true,
      },
    });

    // Grade distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    allGrades.forEach((g) => {
      const val = g.overriddenValue ?? g.computedValue;
      const rounded = Math.round(val);
      if (rounded >= 1 && rounded <= 6) {
        distribution[rounded]++;
      }
    });

    // Finalized vs draft count
    const finalizedCount = allGrades.filter((g) => g.isFinalized).length;
    const draftCount = totalGrades - finalizedCount;

    // Top performers (lowest grade = best on German scale)
    const studentGradeMap: Record<string, { total: number; count: number; name: string }> = {};
    for (const g of allGrades) {
      const val = g.overriddenValue ?? g.computedValue;
      if (!studentGradeMap[g.studentId]) {
        studentGradeMap[g.studentId] = { total: 0, count: 0, name: '' };
      }
      studentGradeMap[g.studentId].total += val;
      studentGradeMap[g.studentId].count += 1;
    }

    // Get student names
    const studentIds = Object.keys(studentGradeMap);
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    students.forEach((s) => {
      if (studentGradeMap[s.id]) {
        studentGradeMap[s.id].name = `${s.firstName} ${s.lastName}`;
      }
    });

    // Calculate averages and sort
    const studentAverages = studentIds
      .map((id) => ({
        id,
        name: studentGradeMap[id].name,
        average: studentGradeMap[id].count > 0 ? studentGradeMap[id].total / studentGradeMap[id].count : 0,
        gradeCount: studentGradeMap[id].count,
      }))
      .sort((a, b) => a.average - b.average); // Lower = better on German scale

    const topPerformers = studentAverages.slice(0, 5);
    const bottomPerformers = studentAverages.slice(-5).reverse();

    // Risk students (average >= 4.5, trending towards 5-6)
    const riskStudents = studentAverages.filter((s) => s.average >= 4.5 && s.gradeCount >= 2);

    // Get classes for filter
    const classes = await db.classGroup.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true, name: true, gradeLevel: true },
      orderBy: { gradeLevel: 'asc' },
    });

    // Get subjects for filter
    const subjects = await db.subject.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Subject difficulty ranking
    const subjectGradeMap: Record<string, { total: number; count: number; name: string }> = {};
    for (const g of allGrades) {
      const val = g.overriddenValue ?? g.computedValue;
      if (!subjectGradeMap[g.subjectId]) {
        subjectGradeMap[g.subjectId] = { total: 0, count: 0, name: '' };
      }
      subjectGradeMap[g.subjectId].total += val;
      subjectGradeMap[g.subjectId].count += 1;
    }

    subjects.forEach((s) => {
      if (subjectGradeMap[s.id]) {
        subjectGradeMap[s.id].name = s.name;
      }
    });

    const subjectDifficulty = Object.entries(subjectGradeMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        average: data.count > 0 ? data.total / data.count : 0,
        gradeCount: data.count,
      }))
      .sort((a, b) => b.average - a.average); // Higher average = harder

    // Class average comparison
    const classGradeMap: Record<string, { total: number; count: number; name: string }> = {};
    for (const g of allGrades) {
      const val = g.overriddenValue ?? g.computedValue;
      if (!classGradeMap[g.classGroupId]) {
        classGradeMap[g.classGroupId] = { total: 0, count: 0, name: '' };
      }
      classGradeMap[g.classGroupId].total += val;
      classGradeMap[g.classGroupId].count += 1;
    }

    classes.forEach((c) => {
      if (classGradeMap[c.id]) {
        classGradeMap[c.id].name = c.name;
      }
    });

    const classAverages = Object.entries(classGradeMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        average: data.count > 0 ? data.total / data.count : 0,
        gradeCount: data.count,
      }))
      .sort((a, b) => a.average - b.average);

    // Teacher comparison (admin only)
    let teacherComparison: Array<{ id: string; name: string; average: number; gradeCount: number }> = [];
    if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      const teacherIds = await db.classGroupTeacher.findMany({
        where: schoolId ? { classGroup: { schoolId } } : {},
        select: { userId: true, user: { select: { id: true, firstName: true, lastName: true } } },
        distinct: ['userId'],
      });

      for (const t of teacherIds) {
        const teacherClasses = await db.classGroupTeacher.findMany({
          where: { userId: t.userId },
          select: { classGroupId: true },
        });
        const tClassIds = teacherClasses.map((tc) => tc.classGroupId);
        const tGrades = allGrades.filter((g) => tClassIds.includes(g.classGroupId));
        if (tGrades.length > 0) {
          const avg = tGrades.reduce((sum, g) => sum + (g.overriddenValue ?? g.computedValue), 0) / tGrades.length;
          teacherComparison.push({
            id: t.user.id,
            name: `${t.user.firstName} ${t.user.lastName}`,
            average: Math.round(avg * 100) / 100,
            gradeCount: tGrades.length,
          });
        }
      }
      teacherComparison.sort((a, b) => a.average - b.average);
    }

    return NextResponse.json({
      totalGrades,
      averageGrade: gradeAgg._avg.computedValue ? Math.round(gradeAgg._avg.computedValue * 100) / 100 : 0,
      minGrade: gradeAgg._min.computedValue ?? 0,
      maxGrade: gradeAgg._max.computedValue ?? 0,
      finalizedCount,
      draftCount,
      distribution,
      topPerformers,
      bottomPerformers,
      riskStudents,
      classes,
      subjects,
      subjectDifficulty,
      classAverages,
      teacherComparison,
    });
  } catch (error) {
    console.error('Grade analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
