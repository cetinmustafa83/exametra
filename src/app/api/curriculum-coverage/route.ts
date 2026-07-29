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
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');

    if (!classGroupId) {
      return NextResponse.json(
        { error: 'classGroupId is required' },
        { status: 400 }
      );
    }

    // Verify access: must be admin of the school OR a teacher of the class
    const classGroup = await db.classGroup.findUnique({
      where: { id: classGroupId },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolType: true,
        schoolId: true,
        schoolYearId: true,
      },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SCHOOL_ADMIN' || session.user.schoolId !== classGroup.schoolId) {
      if (session.user?.role === 'TEACHER') {
        const teacherLink = await db.classGroupTeacher.findFirst({
          where: { classGroupId, userId: session.userId },
        });
        if (!teacherLink && session.user.schoolId !== classGroup.schoolId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Get all assignments for this class (optionally filtered by subject)
    const assignmentWhere: { classGroupId: string; subjectId?: string } = { classGroupId };
    if (subjectId) assignmentWhere.subjectId = subjectId;

    const assignments = await db.classCompetencyAssignment.findMany({
      where: assignmentWhere,
      include: {
        subject: { select: { id: true, name: true } },
        competencyTemplate: {
          include: {
            categories: {
              orderBy: { order: 'asc' },
              include: {
                competencies: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    categoryId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        classGroup: { id: classGroup.id, name: classGroup.name, gradeLevel: classGroup.gradeLevel, schoolType: classGroup.schoolType },
        subject: null,
        totals: {
          competencies: 0,
          assessed: 0,
          notAssessed: 0,
          coveragePercent: 0,
          studentsCount: 0,
          assessmentsCount: 0,
          progressEntriesCount: 0,
        },
        byCategory: [],
        byCompetency: [],
        notAssessedList: [],
        recentAssessed: [],
        hasAssignments: false,
      });
    }

    // Aggregate all competencies across all assignments
    const competencySet = new Map<string, { id: string; code: string; title: string; categoryId: string; categoryName: string; categoryColor: string | null; subjectName: string }>();
    const categoryMap = new Map<string, { id: string; name: string; color: string | null }>();

    for (const assignment of assignments) {
      const template = assignment.competencyTemplate;
      for (const category of template.categories) {
        if (!categoryMap.has(category.id)) {
          categoryMap.set(category.id, { id: category.id, name: category.name, color: category.color });
        }
        for (const comp of category.competencies) {
          if (!competencySet.has(comp.id)) {
            competencySet.set(comp.id, {
              id: comp.id,
              code: comp.code,
              title: comp.title,
              categoryId: category.id,
              categoryName: category.name,
              categoryColor: category.color,
              subjectName: assignment.subject?.name ?? '',
            });
          }
        }
      }
    }

    const competencyIds = Array.from(competencySet.keys());

    // Count students enrolled in this class
    const studentsCount = await db.enrollment.count({
      where: { classGroupId, endDate: null },
    });

    if (competencyIds.length === 0) {
      return NextResponse.json({
        classGroup: { id: classGroup.id, name: classGroup.name, gradeLevel: classGroup.gradeLevel, schoolType: classGroup.schoolType },
        subject: subjectId ? assignments[0]?.subject : null,
        totals: {
          competencies: 0,
          assessed: 0,
          notAssessed: 0,
          coveragePercent: 0,
          studentsCount,
          assessmentsCount: 0,
          progressEntriesCount: 0,
        },
        byCategory: [],
        byCompetency: [],
        notAssessedList: [],
        recentAssessed: [],
        hasAssignments: true,
      });
    }

    // Fetch all LearningProgressEntries for this class + these competencies (efficient single query)
    const progressEntries = await db.learningProgressEntry.findMany({
      where: {
        classGroupId,
        competencyId: { in: competencyIds },
      },
      select: {
        id: true,
        competencyId: true,
        studentId: true,
        date: true,
        masteryLevelValue: true,
      },
    });

    // Fetch all AssessmentCompetencyLinks for these competencies (with assessment + results for this class)
    const assessmentLinks = await db.assessmentCompetencyLink.findMany({
      where: { competencyId: { in: competencyIds } },
      select: {
        competencyId: true,
        assessmentId: true,
        assessment: {
          select: {
            id: true,
            classGroupId: true,
            date: true,
            assessmentResults: { select: { id: true, studentId: true } },
          },
        },
      },
    });

    // Filter assessment links to only those assessments for this class
    const classAssessmentLinks = assessmentLinks.filter((l) => l.assessment.classGroupId === classGroupId);
    const assessmentsCount = new Set(classAssessmentLinks.map((l) => l.assessmentId)).size;

    // Aggregate per competency
    const progressByCompetency = new Map<string, { count: number; students: Set<string>; lastDate: Date | null; lastMastery: number | null }>();
    for (const entry of progressEntries) {
      const cur = progressByCompetency.get(entry.competencyId) ?? { count: 0, students: new Set<string>(), lastDate: null, lastMastery: null };
      cur.count += 1;
      cur.students.add(entry.studentId);
      if (!cur.lastDate || entry.date > cur.lastDate) {
        cur.lastDate = entry.date;
        cur.lastMastery = entry.masteryLevelValue;
      }
      progressByCompetency.set(entry.competencyId, cur);
    }

    const assessmentByCompetency = new Map<string, { count: number; students: Set<string> }>();
    for (const link of classAssessmentLinks) {
      const cur = assessmentByCompetency.get(link.competencyId) ?? { count: 0, students: new Set<string>() };
      cur.count += link.assessment.assessmentResults.length;
      for (const r of link.assessment.assessmentResults) cur.students.add(r.studentId);
      assessmentByCompetency.set(link.competencyId, cur);
    }

    // Build byCompetency list
    const byCompetency = Array.from(competencySet.values()).map((c) => {
      const prog = progressByCompetency.get(c.id);
      const assess = assessmentByCompetency.get(c.id);
      const progressCount = prog?.count ?? 0;
      const assessmentCount = assess?.count ?? 0;
      // Deduplicate students (in case same student is in both)
      const studentSet = new Set<string>();
      prog?.students.forEach((s) => studentSet.add(s));
      assess?.students.forEach((s) => studentSet.add(s));
      const uniqueStudentsAssessed = studentSet.size;
      const lastAssessedDate = prog?.lastDate ?? null;

      let status: 'covered' | 'partial' | 'untouched' = 'untouched';
      if (studentsCount > 0) {
        const ratio = uniqueStudentsAssessed / studentsCount;
        if (ratio >= 0.8) status = 'covered';
        else if (ratio > 0) status = 'partial';
      } else if (uniqueStudentsAssessed > 0) {
        status = 'covered';
      }

      return {
        competencyId: c.id,
        code: c.code,
        title: c.title,
        categoryName: c.categoryName,
        categoryColor: c.categoryColor ?? '#10b981',
        assessmentCount,
        progressCount,
        studentsAssessed: uniqueStudentsAssessed,
        lastAssessedDate: lastAssessedDate ? lastAssessedDate.toISOString() : null,
        lastMasteryLevel: prog?.lastMastery ?? null,
        status,
      };
    });

    // byCategory aggregation (assessed = covered + partial, notAssessed = untouched)
    const byCategoryMap = new Map<string, { categoryId: string; categoryName: string; categoryColor: string; total: number; assessed: number; notAssessed: number }>();
    for (const c of byCompetency) {
      const cur = byCategoryMap.get(c.categoryName) ?? {
        categoryId: c.categoryName,
        categoryName: c.categoryName,
        categoryColor: c.categoryColor,
        total: 0,
        assessed: 0,
        notAssessed: 0,
      };
      cur.total += 1;
      if (c.status === 'covered' || c.status === 'partial') cur.assessed += 1;
      else cur.notAssessed += 1;
      byCategoryMap.set(c.categoryName, cur);
    }
    const byCategory = Array.from(byCategoryMap.values()).map((b) => ({
      ...b,
      coveragePercent: b.total > 0 ? Math.round((b.assessed / b.total) * 100) : 0,
    }));

    // Totals
    const assessed = byCompetency.filter((c) => c.status !== 'untouched').length;
    const notAssessed = byCompetency.length - assessed;
    const coveragePercent = byCompetency.length > 0 ? Math.round((assessed / byCompetency.length) * 100) : 0;

    // notAssessedList (prioritize untouched, then partial; sort by category name)
    const notAssessedList = byCompetency
      .filter((c) => c.status !== 'covered')
      .sort((a, b) => {
        const orderA = a.status === 'untouched' ? 0 : 1;
        const orderB = b.status === 'untouched' ? 0 : 1;
        if (orderA !== orderB) return orderA - orderB;
        return a.categoryName.localeCompare(b.categoryName);
      })
      .slice(0, 20)
      .map((c) => ({
        competencyId: c.competencyId,
        code: c.code,
        title: c.title,
        categoryName: c.categoryName,
        categoryColor: c.categoryColor,
        status: c.status,
        studentsAssessed: c.studentsAssessed,
        studentsCount,
      }));

    // recentAssessed — 5 most recent
    const recentAssessed = byCompetency
      .filter((c) => c.lastAssessedDate)
      .sort((a, b) => new Date(b.lastAssessedDate!).getTime() - new Date(a.lastAssessedDate!).getTime())
      .slice(0, 5)
      .map((c) => ({
        competencyId: c.competencyId,
        code: c.code,
        title: c.title,
        categoryName: c.categoryName,
        date: c.lastAssessedDate,
        masteryLevelValue: c.lastMasteryLevel,
      }));

    return NextResponse.json({
      classGroup: { id: classGroup.id, name: classGroup.name, gradeLevel: classGroup.gradeLevel, schoolType: classGroup.schoolType },
      subject: subjectId ? assignments[0]?.subject ?? null : null,
      totals: {
        competencies: byCompetency.length,
        assessed,
        notAssessed,
        coveragePercent,
        studentsCount,
        assessmentsCount,
        progressEntriesCount: progressEntries.length,
      },
      byCategory,
      byCompetency,
      notAssessedList,
      recentAssessed,
      hasAssignments: true,
    });
  } catch (error) {
    console.error('Curriculum coverage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
