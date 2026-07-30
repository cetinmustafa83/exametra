import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const exportSchema = z.object({
  reportIds: z.array(z.string().min(1)).min(1),
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
      session.user?.role !== 'VICE_PRINCIPAL' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportIds } = parsed.data;

    const reports = await db.report.findMany({
      where: { id: { in: reportIds } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, dateOfBirth: true } },
        classGroup: {
          select: {
            id: true, name: true, gradeLevel: true, schoolType: true,
            responsibleTeacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: { select: { id: true, firstName: true, lastName: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: { select: { id: true, name: true, color: true } },
          },
        },
        template: { select: { id: true, name: true, layout: true, gradingScale: true } },
      },
    });

    // Get school info for branding
    const schoolId = session.user?.schoolId;
    let school = null;
    if (schoolId) {
      school = await db.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true, name: true, motto: true, logoUrl: true,
          primaryColor: true, secondaryColor: true, address: true, phone: true,
        },
      });
    }

    // Get computed grades for each report
    const reportsWithGrades = await Promise.all(
      reports.map(async (report) => {
        const computedGrades = await db.computedGrade.findMany({
          where: {
            studentId: report.studentId,
            classGroupId: report.classGroupId,
            schoolYearId: report.schoolYearId,
          },
          include: {
            subject: { select: { id: true, name: true } },
          },
          orderBy: { subject: { name: 'asc' } },
        });
        return { ...report, computedGrades };
      })
    );

    // Return the data for client-side PDF generation
    // The client will use window.print() or a print-specific CSS
    return NextResponse.json({
      reports: reportsWithGrades,
      school,
      exportDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ReportCards export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
