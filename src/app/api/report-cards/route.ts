import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessClass, canAccessStudent, getTeacherClassIds } from '@/lib/access-policy';

const createReportCardSchema = z.object({
  studentId: z.string().min(1),
  classGroupId: z.string().min(1),
  schoolYearId: z.string().min(1),
  period: z.string().min(1),
  includesGrades: z.boolean().default(false),
  teacherComments: z.string().optional(),
  attendanceSummary: z.string().optional(),
  overallAssessment: z.string().optional(),
  templateId: z.string().optional(),
  sections: z
    .array(
      z.object({
        competencyCategoryId: z.string().optional(),
        generatedText: z.string().min(1),
        order: z.number().int().default(0),
      })
    )
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classGroupId = searchParams.get('classGroupId');
    const schoolYearId = searchParams.get('schoolYearId');
    const status = searchParams.get('status');
    const period = searchParams.get('period');
    const templateId = searchParams.get('templateId');

    const where: Record<string, unknown> = {};
    if (studentId && (!session.user || !(await canAccessStudent(session.user, studentId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (classGroupId && (!session.user || !(await canAccessClass(session.user, classGroupId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentId) where.studentId = studentId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (status) where.status = status;
    if (period) where.period = period;
    if (templateId) where.templateId = templateId;

    // Role-based filtering
    if (session.user?.role === 'STUDENT') {
      // Students can only see their own published reports
      const student = await db.student.findFirst({
        where: { userId: session.userId },
      });
      if (student) {
        where.studentId = student.id;
        where.status = 'PUBLISHED';
      } else {
        return NextResponse.json([]);
      }
    } else if (session.user?.role === 'PARENT') {
      // Parents can only see their children's published reports
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
      });
      const childIds = parentLinks.map((l) => l.studentId);
      where.studentId = { in: childIds };
      where.status = 'PUBLISHED';
    } else if (session.user?.role === 'TEACHER') {
      // Teachers see reports for their classes
      if (!classGroupId) {
        where.classGroupId = { in: await getTeacherClassIds(session.userId) };
      }
    }

    const reports = await db.report.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
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

    return NextResponse.json(reports);
  } catch (error) {
    console.error('ReportCards GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const parsed = createReportCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sections, ...reportData } = parsed.data;
    if (!session.user || !(await canAccessStudent(session.user, reportData.studentId)) || !(await canAccessClass(session.user, reportData.classGroupId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If attendance summary not provided, try to compute it
    let attendanceSummary = reportData.attendanceSummary;
    if (!attendanceSummary) {
      const attendanceRecords = await db.attendanceRecord.findMany({
        where: {
          studentId: reportData.studentId,
          session: {
            classGroupId: reportData.classGroupId,
            date: { gte: new Date(new Date().getFullYear(), 0, 1) },
          },
        },
        include: { session: true },
      });
      const summary = {
        present: attendanceRecords.filter((r) => r.status === 'PRESENT').length,
        absent: attendanceRecords.filter((r) => r.status === 'ABSENT').length,
        excused: attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
        late: attendanceRecords.filter((r) => r.status === 'LATE').length,
        total: attendanceRecords.length,
      };
      attendanceSummary = JSON.stringify(summary);
    }

    const report = await db.report.create({
      data: {
        studentId: reportData.studentId,
        classGroupId: reportData.classGroupId,
        schoolYearId: reportData.schoolYearId,
        period: reportData.period,
        generatedByUserId: session.userId,
        includesGrades: reportData.includesGrades,
        status: 'DRAFT',
        teacherComments: reportData.teacherComments,
        attendanceSummary,
        overallAssessment: reportData.overallAssessment,
        templateId: reportData.templateId,
        sections: sections
          ? {
              create: sections.map((s) => ({
                competencyCategoryId: s.competencyCategoryId ?? null,
                generatedText: s.generatedText,
                order: s.order,
              })),
            }
          : undefined,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        classGroup: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: { select: { id: true, firstName: true, lastName: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: { select: { id: true, name: true } },
          },
        },
        template: { select: { id: true, name: true, layout: true } },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('ReportCards POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
