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

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required (pass as query param or have a school assigned to user)' },
        { status: 400 }
      );
    }

    // ── Classes Overview ──
    const classWhere: Record<string, unknown> = { schoolId };
    if (schoolYearId) classWhere.schoolYearId = schoolYearId;

    // For teachers, only show assigned classes
    if (session.user?.role === 'TEACHER' && session.userId) {
      classWhere.teachers = { some: { userId: session.userId } };
    }

    const classes = await db.classGroup.findMany({
      where: classWhere,
      orderBy: { name: 'asc' },
      include: {
        schoolYear: { select: { id: true, label: true } },
        teachers: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: {
          select: {
            enrollments: { where: { endDate: null } },
            assessments: true,
          },
        },
      },
    });

    const classesOverview = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      schoolType: cls.schoolType,
      schoolYear: cls.schoolYear,
      studentCount: cls._count.enrollments,
      assessmentCount: cls._count.assessments,
      teachers: cls.teachers.map((t) => ({
        ...t.user,
        teacherRole: t.role,
      })),
    }));

    // ── Recent Progress Entries ──
    const recentEntries = await db.learningProgressEntry.findMany({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { classGroup: { schoolYearId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        competency: {
          select: {
            id: true,
            code: true,
            title: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });

    // ── Students needing attention ──
    // Find students with low average mastery (< 2.0 out of 4.0)
    const studentsWithProgress = await db.learningProgressEntry.findMany({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { classGroup: { schoolYearId } } : {}),
      },
      select: {
        studentId: true,
        masteryLevelValue: true,
        competencyId: true,
      },
    });

    // Calculate average mastery per student
    const studentMasteryMap = new Map<string, { total: number; count: number }>();
    for (const entry of studentsWithProgress) {
      const current = studentMasteryMap.get(entry.studentId) ?? { total: 0, count: 0 };
      current.total += entry.masteryLevelValue;
      current.count += 1;
      studentMasteryMap.set(entry.studentId, current);
    }

    const lowMasteryStudentIds = Array.from(studentMasteryMap.entries())
      .filter(([, data]) => data.count > 0 && data.total / data.count < 2.0)
      .map(([id]) => id);

    const studentsNeedingAttention = await db.student.findMany({
      where: {
        id: { in: lowMasteryStudentIds },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrollments: {
          where: { endDate: null },
          select: {
            classGroup: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
      },
    });

    // Add average mastery to each student
    const studentsWithAvg = studentsNeedingAttention.map((s) => {
      const data = studentMasteryMap.get(s.id);
      const avgMastery = data ? Math.round(data.total / data.count * 100) / 100 : 0;
      return {
        ...s,
        averageMastery: avgMastery,
      };
    });

    // ── Stats ──
    const totalStudents = await db.student.count({
      where: { schoolId, deletedAt: null },
    });

    const totalClasses = await db.classGroup.count({
      where: classWhere,
    });

    const totalAssessments = await db.assessment.count({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { classGroup: { schoolYearId } } : {}),
      },
    });

    const totalProgressEntries = await db.learningProgressEntry.count({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { classGroup: { schoolYearId } } : {}),
      },
    });

    const totalReports = await db.report.count({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { schoolYearId } : {}),
      },
    });

    const recentAssessments = await db.assessment.findMany({
      where: {
        classGroup: { schoolId },
        ...(schoolYearId ? { classGroup: { schoolYearId } } : {}),
      },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: {
          select: { assessmentResults: true },
        },
      },
    });

    return NextResponse.json({
      classesOverview,
      recentEntries,
      recentAssessments,
      studentsNeedingAttention: studentsWithAvg,
      stats: {
        totalStudents,
        totalClasses,
        totalAssessments,
        totalProgressEntries,
        totalReports,
      },
    });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
