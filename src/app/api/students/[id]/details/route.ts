import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: studentId } = await params;

    // Load the student with relations
    const student = await db.student.findUnique({
      where: { id: studentId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        externalId: true,
        createdAt: true,
        schoolId: true,
        school: { select: { id: true, name: true } },
        enrollments: {
          where: { endDate: null },
          include: {
            classGroup: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
                schoolType: true,
              },
            },
            schoolYear: { select: { id: true, label: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 1. Progress entries (timeline)
    const progressEntries = await db.learningProgressEntry.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 100,
      include: {
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

    // 2. Assessment results
    const assessmentResults = await db.assessmentResult.findMany({
      where: { studentId },
      orderBy: { assessment: { date: 'desc' } },
      take: 50,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            date: true,
            type: true,
            maxScore: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 3. Computed grades
    const computedGrades = await db.computedGrade.findMany({
      where: { studentId },
      orderBy: { computedAt: 'desc' },
      take: 50,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
      },
    });

    // 4. Reports
    const reports = await db.report.findMany({
      where: { studentId },
      orderBy: { generatedAt: 'desc' },
      take: 30,
      include: {
        classGroup: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: { select: { id: true, firstName: true, lastName: true } },
        sections: {
          orderBy: { order: 'asc' },
          select: { id: true, generatedText: true, order: true },
        },
      },
    });

    // 5. Competence flowers — for each class+subject assignment, compute categories
    const classIds = student.enrollments.map((e) => e.classGroup.id);
    const assignments = classIds.length > 0
      ? await db.classCompetencyAssignment.findMany({
          where: { classGroupId: { in: classIds } },
          include: {
            subject: { select: { id: true, name: true } },
            competencyTemplate: {
              include: {
                categories: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    color: true,
                    competencies: {
                      orderBy: { order: 'asc' },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        })
      : [];

    const flowers: Array<{
      studentId: string;
      studentName: string;
      subjectId: string;
      subjectName: string;
      categories: Array<{
        categoryId: string;
        categoryName: string;
        color: string | null;
        averageMasteryLevel: number;
        competencyCount: number;
        assessedCompetencyCount: number;
      }>;
    }> = [];

    const studentName = `${student.firstName} ${student.lastName}`;

    for (const assignment of assignments) {
      const template = assignment.competencyTemplate;
      const templateId = assignment.clonedTemplateId ?? assignment.competencyTemplateId;
      let categories = template.categories;

      // If cloned, load the cloned template's categories
      if (assignment.clonedTemplateId) {
        const cloned = await db.competencyTemplate.findUnique({
          where: { id: assignment.clonedTemplateId },
          include: {
            categories: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                color: true,
                competencies: { orderBy: { order: 'asc' }, select: { id: true } },
              },
            },
          },
        });
        if (cloned) categories = cloned.categories;
      }

      // Get latest progress entries per competency for this student/class
      const entries = await db.learningProgressEntry.findMany({
        where: {
          studentId,
          classGroupId: assignment.classGroupId,
          competency: {
            category: { competencyTemplateId: templateId },
          },
        },
        orderBy: { date: 'desc' },
        select: {
          competencyId: true,
          masteryLevelValue: true,
        },
      });

      // Latest value per competency (entries sorted by date desc)
      const compMap = new Map<string, number>();
      for (const entry of entries) {
        if (!compMap.has(entry.competencyId)) {
          compMap.set(entry.competencyId, entry.masteryLevelValue);
        }
      }

      const categoryResults = categories.map((cat) => {
        const catCompetencyIds = cat.competencies.map((c) => c.id);
        const assessedValues = catCompetencyIds
          .filter((cid) => compMap.has(cid))
          .map((cid) => compMap.get(cid)!);
        const avg =
          assessedValues.length > 0
            ? assessedValues.reduce((a, b) => a + b, 0) / assessedValues.length
            : 0;
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color,
          averageMasteryLevel: Math.round(avg * 100) / 100,
          competencyCount: catCompetencyIds.length,
          assessedCompetencyCount: assessedValues.length,
        };
      });

      flowers.push({
        studentId: student.id,
        studentName,
        subjectId: assignment.subject.id,
        subjectName: assignment.subject.name,
        categories: categoryResults,
      });
    }

    // 6. Quick stats
    const totalProgressEntries = progressEntries.length;
    const averageMastery =
      totalProgressEntries > 0
        ? Math.round(
            (progressEntries.reduce((sum, e) => sum + e.masteryLevelValue, 0) /
              totalProgressEntries) *
              100
          ) / 100
        : 0;

    const latestGrade =
      computedGrades.length > 0
        ? {
            value: computedGrades[0].overriddenValue ?? computedGrades[0].computedValue,
            period: computedGrades[0].period,
            subjectName: computedGrades[0].subject.name,
          }
        : null;

    return NextResponse.json({
      student,
      progressEntries,
      assessmentResults,
      computedGrades,
      reports,
      flowers,
      stats: {
        totalProgressEntries,
        averageMastery,
        latestGrade,
        totalReports: reports.length,
        totalAssessments: assessmentResults.length,
      },
    });
  } catch (error) {
    console.error('Student detail GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
