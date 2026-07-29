import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createExportSchema = z.object({
  scope: z.enum(['STUDENT', 'CLASS', 'SCHOOL']),
  scopeId: z.string().optional(),
  format: z.enum(['CSV', 'JSON', 'PDF']).default('JSON'),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestedByUserId = searchParams.get('requestedByUserId') ?? session.userId;

    const where: Record<string, unknown> = { requestedByUserId };
    if (status) where.status = status;

    const exports = await db.dataExportRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        requestedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(exports);
  } catch (error) {
    console.error('DataExport GET error:', error);
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
    const parsed = createExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const exportRequest = await db.dataExportRequest.create({
      data: {
        requestedByUserId: session.userId,
        schoolId: session.user?.schoolId ?? parsed.data.scopeId ?? null,
        scope: parsed.data.scope,
        scopeId: parsed.data.scopeId ?? null,
        status: 'PENDING',
      },
    });

    // Process the export request based on scope
    // For now, we create the request and return it
    // In a real app, this would be processed asynchronously

    let exportData: Record<string, unknown> = {};

    if (parsed.data.scope === 'STUDENT' && parsed.data.scopeId) {
      const student = await db.student.findUnique({
        where: { id: parsed.data.scopeId, deletedAt: null },
        include: {
          school: { select: { name: true } },
          enrollments: {
            include: {
              classGroup: { select: { name: true, gradeLevel: true } },
            },
          },
          learningProgressEntries: {
            include: {
              competency: { select: { code: true, title: true } },
              teacher: { select: { firstName: true, lastName: true } },
            },
          },
          assessmentResults: {
            include: {
              assessment: { select: { title: true, type: true } },
            },
          },
        },
      });
      exportData = { student };
    } else if (parsed.data.scope === 'CLASS' && parsed.data.scopeId) {
      const classGroup = await db.classGroup.findUnique({
        where: { id: parsed.data.scopeId },
        include: {
          school: { select: { name: true } },
          schoolYear: { select: { label: true } },
          teachers: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          enrollments: {
            where: { endDate: null },
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          assessments: {
            include: {
              subject: { select: { name: true } },
              _count: { select: { assessmentResults: true } },
            },
          },
        },
      });
      exportData = { classGroup };
    } else if (parsed.data.scope === 'SCHOOL') {
      const schoolId = parsed.data.scopeId ?? session.user?.schoolId;
      if (schoolId) {
        const school = await db.school.findUnique({
          where: { id: schoolId },
          include: {
            classGroups: {
              include: {
                _count: { select: { enrollments: true } },
              },
            },
            subjects: true,
            _count: {
              select: {
                users: { where: { deletedAt: null } },
                students: { where: { deletedAt: null } },
              },
            },
          },
        });
        exportData = { school };
      }
    }

    // Update status to completed
    await db.dataExportRequest.update({
      where: { id: exportRequest.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...exportRequest,
      status: 'COMPLETED',
      exportData,
    }, { status: 201 });
  } catch (error) {
    console.error('DataExport POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
