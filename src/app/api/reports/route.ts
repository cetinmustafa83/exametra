import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createReportSchema = z.object({
  studentId: z.string().min(1),
  classGroupId: z.string().min(1),
  schoolYearId: z.string().min(1),
  period: z.string().min(1),
  includesGrades: z.boolean().default(false),
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

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (status) where.status = status;

    const reports = await db.report.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sections, ...reportData } = parsed.data;

    const report = await db.report.create({
      data: {
        studentId: reportData.studentId,
        classGroupId: reportData.classGroupId,
        schoolYearId: reportData.schoolYearId,
        period: reportData.period,
        generatedByUserId: session.userId,
        includesGrades: reportData.includesGrades,
        status: 'DRAFT',
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
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const updateSchema = z.object({
      id: z.string().min(1),
      status: z.enum(['DRAFT', 'FINAL']).optional(),
      includesGrades: z.boolean().optional(),
      pdfFilePath: z.string().optional(),
      sections: z.array(z.object({
        id: z.string().min(1),
        generatedText: z.string().min(1),
      })).optional(),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, sections, ...updateData } = parsed.data;

    // Update sections if provided
    if (sections && sections.length > 0) {
      for (const section of sections) {
        await db.reportSection.update({
          where: { id: section.id },
          data: { generatedText: section.generatedText },
        });
      }
    }

    const report = await db.report.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        schoolYear: { select: { id: true, label: true } },
        generatedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            competencyCategory: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Reports PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
