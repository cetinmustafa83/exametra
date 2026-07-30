import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const batchGenerateSchema = z.object({
  classGroupId: z.string().min(1),
  schoolYearId: z.string().min(1),
  period: z.string().min(1),
  templateId: z.string().optional(),
  includesGrades: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = batchGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { classGroupId, schoolYearId, period, templateId, includesGrades } = parsed.data;

    // Get all enrolled students in the class
    const enrollments = await db.enrollment.findMany({
      where: {
        classGroupId,
        schoolYearId,
        endDate: null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ error: 'No students found in this class' }, { status: 400 });
    }

    // Get competency categories for the class
    const competencyAssignments = await db.classCompetencyAssignment.findMany({
      where: { classGroupId, schoolYearId },
      include: {
        competencyTemplate: {
          include: {
            categories: {
              include: { competencies: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
    });

    // Get computed grades for all students
    const computedGrades = await db.computedGrade.findMany({
      where: { classGroupId, schoolYearId },
      include: { subject: { select: { id: true, name: true } } },
    });

    const createdReports = [];

    for (const enrollment of enrollments) {
      // Check if report already exists for this student/period
      const existing = await db.report.findFirst({
        where: {
          studentId: enrollment.studentId,
          classGroupId,
          schoolYearId,
          period,
        },
      });

      if (existing) continue; // Skip if report already exists

      // Build sections from competency categories
      const sections: { competencyCategoryId: string | null; generatedText: string; order: number }[] = [];

      for (const assignment of competencyAssignments) {
        const studentGrades = computedGrades.filter(
          (g) => g.studentId === enrollment.studentId && g.subjectId === assignment.subjectId
        );

        for (const category of assignment.competencyTemplate.categories) {
          // Get learning progress for this student in this category
          const progressEntries = await db.learningProgressEntry.findMany({
            where: {
              studentId: enrollment.studentId,
              classGroupId,
              competency: { categoryId: category.id },
            },
            orderBy: { date: 'desc' },
            take: 5,
          });

          const avgMastery =
            progressEntries.length > 0
              ? progressEntries.reduce((sum, e) => sum + e.masteryLevelValue, 0) / progressEntries.length
              : 0;

          const gradeText = studentGrades.length > 0
            ? ` | Note: ${studentGrades[0].overriddenValue ?? studentGrades[0].computedValue}`
            : '';

          const masteryLabel = avgMastery >= 3.5 ? 'weit entwickelt' : avgMastery >= 2.5 ? 'kompetent' : avgMastery >= 1.5 ? 'entwickelt sich' : 'noch nicht erreicht';

          sections.push({
            competencyCategoryId: category.id,
            generatedText: `${category.name}: ${masteryLabel}${gradeText}`,
            order: sections.length,
          });
        }
      }

      // Get attendance summary
      const attendanceRecords = await db.attendanceRecord.findMany({
        where: {
          studentId: enrollment.studentId,
          session: {
            classGroupId,
            date: { gte: new Date(new Date().getFullYear(), 0, 1) },
          },
        },
      });

      const attendanceSummary = JSON.stringify({
        present: attendanceRecords.filter((r) => r.status === 'PRESENT').length,
        absent: attendanceRecords.filter((r) => r.status === 'ABSENT').length,
        excused: attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
        late: attendanceRecords.filter((r) => r.status === 'LATE').length,
        total: attendanceRecords.length,
      });

      const report = await db.report.create({
        data: {
          studentId: enrollment.studentId,
          classGroupId,
          schoolYearId,
          period,
          generatedByUserId: session.userId,
          includesGrades,
          status: 'DRAFT',
          templateId: templateId ?? null,
          attendanceSummary,
          sections: sections.length > 0
            ? { create: sections }
            : undefined,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          classGroup: { select: { id: true, name: true } },
        },
      });

      createdReports.push(report);
    }

    return NextResponse.json({
      generated: createdReports.length,
      skipped: enrollments.length - createdReports.length,
      reports: createdReports,
    });
  } catch (error) {
    console.error('ReportCards batch generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
