import { NextResponse } from 'next/server';
import { z } from 'zod';
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

    const { id } = await params;
    const report = await db.report.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, dateOfBirth: true } },
        classGroup: {
          select: { id: true, name: true, gradeLevel: true, schoolType: true, responsibleTeacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        schoolYear: { select: { id: true, label: true, startDate: true, endDate: true } },
        generatedByUser: { select: { id: true, firstName: true, lastName: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: { select: { id: true, name: true, color: true } },
          },
        },
        template: { select: { id: true, name: true, layout: true, gradingScale: true, sections: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Role-based access check
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({ where: { userId: session.userId } });
      if (!student || student.id !== report.studentId || report.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user?.role === 'PARENT') {
      const link = await db.parentStudentLink.findFirst({
        where: { parentId: session.userId, studentId: report.studentId },
      });
      if (!link || report.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch computed grades for this student/class/schoolYear
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

    return NextResponse.json({ ...report, computedGrades });
  } catch (error) {
    console.error('ReportCard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateReportCardSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'FINAL']).optional(),
  includesGrades: z.boolean().optional(),
  pdfFilePath: z.string().optional(),
  teacherComments: z.string().nullable().optional(),
  attendanceSummary: z.string().nullable().optional(),
  overallAssessment: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  period: z.string().optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        competencyCategoryId: z.string().nullable().optional(),
        generatedText: z.string().min(1),
        order: z.number().int().default(0),
      })
    )
    .optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = updateReportCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sections, ...updateData } = parsed.data;

    // Check if teacher owns this report
    if (session.user?.role === 'TEACHER') {
      const existing = await db.report.findUnique({ where: { id } });
      if (!existing || existing.generatedByUserId !== session.userId) {
        return NextResponse.json({ error: 'You can only edit your own reports' }, { status: 403 });
      }
      // Teachers can only submit for review, not publish
      if (updateData.status === 'PUBLISHED') {
        return NextResponse.json({ error: 'Teachers cannot publish reports directly' }, { status: 403 });
      }
    }

    // Handle status transitions
    const statusUpdate: Record<string, unknown> = {};
    if (updateData.status === 'REVIEW') {
      statusUpdate.reviewedByUserId = session.userId;
      statusUpdate.reviewedAt = new Date();
    }
    if (updateData.status === 'PUBLISHED') {
      statusUpdate.publishedAt = new Date();
    }

    // Update sections if provided
    if (sections && sections.length > 0) {
      // Delete existing sections and recreate
      await db.reportSection.deleteMany({ where: { reportId: id } });
      await db.reportSection.createMany({
        data: sections.map((s) => ({
          reportId: id,
          competencyCategoryId: s.competencyCategoryId ?? null,
          generatedText: s.generatedText,
          order: s.order,
        })),
      });
    }

    const report = await db.report.update({
      where: { id },
      data: {
        ...updateData,
        ...statusUpdate,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: { select: { id: true, firstName: true, lastName: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: { select: { id: true, name: true, color: true } },
          },
        },
        template: { select: { id: true, name: true, layout: true } },
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('ReportCard PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    await db.reportSection.deleteMany({ where: { reportId: id } });
    await db.report.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ReportCard DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
