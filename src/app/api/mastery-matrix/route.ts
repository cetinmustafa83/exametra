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

    if (!classGroupId || !subjectId) {
      return NextResponse.json(
        { error: 'classGroupId and subjectId are required' },
        { status: 400 }
      );
    }

    // Find the competency template assigned to this class + subject
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

    if (!assignment) {
      return NextResponse.json(
        { error: 'No competency template assigned for this class/subject' },
        { status: 404 }
      );
    }

    const templateId = assignment.clonedTemplateId ?? assignment.competencyTemplateId;

    // Re-fetch with full template if cloned (so the categories / competencies match the cloned tree)
    let categories: Array<{
      id: string;
      name: string;
      color: string | null;
      order: number;
      competencies: Array<{ id: string; code: string; title: string; categoryId: string }>;
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
                select: { id: true, code: true, title: true, categoryId: true },
              },
            },
          },
        },
      });
      categories = clonedTemplate?.categories ?? assignment.competencyTemplate.categories;
    } else {
      categories = assignment.competencyTemplate.categories;
    }

    // Flatten competencies with category info
    const competencies = categories.flatMap((cat) =>
      cat.competencies.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        category: {
          id: cat.id,
          name: cat.name,
          color: cat.color,
        },
      }))
    );

    if (competencies.length === 0) {
      return NextResponse.json({ students: [], competencies: [], matrix: [] });
    }

    // Get students enrolled in this class (active enrollments)
    const enrollments = await db.enrollment.findMany({
      where: { classGroupId, endDate: null },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, deletedAt: true },
        },
      },
    });

    const students = enrollments
      .filter((e) => e.student.deletedAt === null)
      .map((e) => ({
        id: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

    if (students.length === 0) {
      return NextResponse.json({ students: [], competencies, matrix: [] });
    }

    const studentIds = students.map((s) => s.id);
    const competencyIds = competencies.map((c) => c.id);

    // Fetch all progress entries for these students + competencies in this class
    // (scope by competency.category.competencyTemplateId = templateId to avoid cross-template noise)
    const progressEntries = await db.learningProgressEntry.findMany({
      where: {
        studentId: { in: studentIds },
        classGroupId,
        competencyId: { in: competencyIds },
        competency: {
          category: { competencyTemplateId: templateId },
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        studentId: true,
        competencyId: true,
        date: true,
        masteryLevelValue: true,
      },
    });

    // For each (student, competency) keep the latest entry (entries are sorted desc by date)
    const latestMap = new Map<string, { level: number; count: number; lastDate: string | null }>();
    for (const e of progressEntries) {
      const key = `${e.studentId}::${e.competencyId}`;
      const cur = latestMap.get(key);
      if (cur) {
        cur.count += 1;
        // Keep earliest "latest" date if already set, else update if newer
        if (!cur.lastDate || new Date(e.date).getTime() > new Date(cur.lastDate).getTime()) {
          cur.lastDate = e.date.toISOString();
        }
      } else {
        latestMap.set(key, {
          level: e.masteryLevelValue,
          count: 1,
          lastDate: e.date.toISOString(),
        });
      }
    }

    const matrix = Array.from(latestMap.entries()).map(([key, v]) => {
      const [studentId, competencyId] = key.split('::');
      return {
        studentId,
        competencyId,
        latestMasteryLevel: v.level,
        entryCount: v.count,
        lastEntryDate: v.lastDate,
      };
    });

    return NextResponse.json({ students, competencies, matrix });
  } catch (error) {
    console.error('MasteryMatrix GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
