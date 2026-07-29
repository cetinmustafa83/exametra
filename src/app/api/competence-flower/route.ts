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
    const studentId = searchParams.get('studentId');
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');

    if (!studentId && !classGroupId) {
      return NextResponse.json(
        { error: 'studentId or classGroupId is required' },
        { status: 400 }
      );
    }

    // Find the competency template assigned to this class + subject
    if (!classGroupId || !subjectId) {
      return NextResponse.json(
        { error: 'classGroupId and subjectId are required' },
        { status: 400 }
      );
    }

    const assignment = await db.classCompetencyAssignment.findFirst({
      where: { classGroupId, subjectId },
      include: {
        competencyTemplate: {
          include: {
            categories: {
              orderBy: { order: 'asc' },
              include: {
                competencies: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'No competency template assigned for this class/subject' },
        { status: 404 }
      );
    }

    const template = assignment.competencyTemplate;
    const templateId = assignment.clonedTemplateId ?? assignment.competencyTemplateId;

    // Re-fetch with full template if cloned
    let categories: Array<{
      id: string;
      name: string;
      color: string | null;
      order: number;
      competencies: Array<{ id: string; code: string; title: string; order: number }>;
    }>;

    if (assignment.clonedTemplateId) {
      const clonedTemplate = await db.competencyTemplate.findUnique({
        where: { id: assignment.clonedTemplateId },
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: {
              competencies: {
                orderBy: { order: 'asc' },
                select: { id: true, code: true, title: true, order: true },
              },
            },
          },
        },
      });
      categories = clonedTemplate?.categories ?? template.categories;
    } else {
      categories = template.categories;
    }

    // Get student IDs to query
    let studentIds: string[];
    if (studentId) {
      studentIds = [studentId];
    } else {
      // Get all students in the class
      const enrollments = await db.enrollment.findMany({
        where: { classGroupId, endDate: null },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    }

    // Fetch latest progress entries for each competency for each student
    const progressEntries = await db.learningProgressEntry.findMany({
      where: {
        studentId: { in: studentIds },
        classGroupId,
        competency: {
          category: {
            competencyTemplateId: templateId,
          },
        },
      },
      orderBy: { date: 'desc' },
      include: {
        competency: {
          select: {
            id: true,
            categoryId: true,
            code: true,
            title: true,
          },
        },
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Group by student, then compute per-category averages
    // For each student, find the latest mastery level per competency, then average per category
    const studentMap = new Map<
      string,
      Map<string, number>
    >(); // studentId -> (competencyId -> latest masteryLevelValue)

    for (const entry of progressEntries) {
      const sid = entry.studentId;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, new Map());
      }
      const compMap = studentMap.get(sid)!;
      // Only keep the latest entry per competency (they are ordered by date desc)
      if (!compMap.has(entry.competencyId)) {
        compMap.set(entry.competencyId, entry.masteryLevelValue);
      }
    }

    // Build the result
    const result: Array<{
      studentId: string;
      studentName: string;
      categories: Array<{
        categoryId: string;
        categoryName: string;
        color: string | null;
        averageMasteryLevel: number;
        competencyCount: number;
        assessedCompetencyCount: number;
      }>;
    }> = [];

    // Get student names
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });

    const studentNameMap = new Map(
      students.map((s) => [s.id, `${s.firstName} ${s.lastName}`])
    );

    for (const [sid, compMap] of studentMap) {
      const categoryResults = categories.map((cat) => {
        const catCompetencies = cat.competencies;
        const assessedValues = catCompetencies
          .filter((c) => compMap.has(c.id))
          .map((c) => compMap.get(c.id)!);

        const avg =
          assessedValues.length > 0
            ? assessedValues.reduce((a, b) => a + b, 0) / assessedValues.length
            : 0;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color,
          averageMasteryLevel: Math.round(avg * 100) / 100,
          competencyCount: catCompetencies.length,
          assessedCompetencyCount: assessedValues.length,
        };
      });

      result.push({
        studentId: sid,
        studentName: studentNameMap.get(sid) ?? 'Unknown',
        categories: categoryResults,
      });
    }

    // Also include students with no entries yet
    for (const sid of studentIds) {
      if (!studentMap.has(sid)) {
        const categoryResults = categories.map((cat) => ({
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color,
          averageMasteryLevel: 0,
          competencyCount: cat.competencies.length,
          assessedCompetencyCount: 0,
        }));

        result.push({
          studentId: sid,
          studentName: studentNameMap.get(sid) ?? 'Unknown',
          categories: categoryResults,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('CompetenceFlower GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
