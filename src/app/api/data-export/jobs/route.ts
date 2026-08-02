// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',');
}

function objectsToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerRow = toCsvRow(headers);
  const dataRows = data.map((item) =>
    toCsvRow(headers.map((h) => item[h] as string | number | null | undefined))
  );
  return [headerRow, ...dataRows].join('\n');
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };
    if (session.user?.role === 'TEACHER') {
      where.userId = session.userId;
    }

    const jobs = await db.dataExportJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Data Export GET error:', error);
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
    const { type, format, filters } = body as {
      type: string;
      format: string;
      filters?: Record<string, unknown>;
    };

    const schoolId = (filters?.schoolId as string) || session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Create export job
    const exportJob = await db.dataExportJob.create({
      data: {
        schoolId,
        userId: session.userId,
        type: type || 'STUDENT',
        format: format || 'CSV',
        filters: filters ? JSON.stringify(filters) : null,
        status: 'processing',
      },
    });

    let exportData: Record<string, unknown>[] = [];
    let fileName = '';

    try {
      if (type === 'STUDENT') {
        const students = await db.student.findMany({
          where: {
            schoolId,
            deletedAt: null,
            ...(filters?.classId ? { enrollments: { some: { classGroupId: filters.classId as string } } } : {}),
          },
          include: {
            enrollments: { include: { classGroup: { select: { name: true } } } },
          },
          take: 10000,
        });
        exportData = students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          externalId: s.externalId || '',
          dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().split('T')[0] : '',
          class: s.enrollments[0]?.classGroup?.name || '',
        }));
        fileName = `students_export_${new Date().toISOString().split('T')[0]}`;
      } else if (type === 'GRADE') {
        const results = await db.assessmentResult.findMany({
          where: {
            assessment: {
              classGroup: { schoolId },
              ...(filters?.classId ? { classGroupId: filters.classId as string } : {}),
              ...(filters?.subjectId ? { subjectId: filters.subjectId as string } : {}),
            },
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
            assessment: { select: { title: true, type: true } },
          },
          take: 10000,
        });
        exportData = results.map((r) => ({
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          assessmentTitle: r.assessment.title,
          assessmentType: r.assessment.type,
          score: r.score ?? '',
          note: r.note || '',
        }));
        fileName = `grades_export_${new Date().toISOString().split('T')[0]}`;
      } else if (type === 'ATTENDANCE') {
        const records = await db.attendanceRecord.findMany({
          where: {
            student: { schoolId, deletedAt: null },
            ...(filters?.classId ? { student: { enrollments: { some: { classGroupId: filters.classId as string } } } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
          take: 10000,
        });
        exportData = records.map((r) => ({
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          status: r.status,
          date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        }));
        fileName = `attendance_export_${new Date().toISOString().split('T')[0]}`;
      } else if (type === 'COMPETENCY') {
        const entries = await db.learningProgressEntry.findMany({
          where: {
            student: { schoolId, deletedAt: null },
            ...(filters?.classId ? { student: { enrollments: { some: { classGroupId: filters.classId as string } } } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
            competency: { select: { code: true, title: true } },
          },
          take: 10000,
        });
        exportData = entries.map((e) => ({
          studentName: `${e.student.firstName} ${e.student.lastName}`,
          competencyCode: e.competency.code,
          competencyTitle: e.competency.title,
          level: e.level,
          note: e.note || '',
        }));
        fileName = `competencies_export_${new Date().toISOString().split('T')[0]}`;
      } else if (type === 'REPORT') {
        const reports = await db.report.findMany({
          where: {
            schoolId,
            ...(filters?.classId ? { classGroupId: filters.classId as string } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
          take: 10000,
        });
        exportData = reports.map((r) => ({
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          title: r.title || '',
          status: r.status,
          createdAt: r.createdAt.toISOString().split('T')[0],
        }));
        fileName = `reports_export_${new Date().toISOString().split('T')[0]}`;
      }

      // Generate file content
      let fileContent: string;
      const ext = format === 'JSON' ? 'json' : 'csv';

      if (format === 'JSON') {
        fileContent = JSON.stringify(exportData, null, 2);
      } else {
        fileContent = objectsToCsv(exportData);
      }

      fileName = `${fileName}.${ext}`;

      // Update export job as completed
      await db.dataExportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'completed',
          fileName,
          fileSize: Buffer.byteLength(fileContent),
          fileData: Buffer.from(fileContent).toString('base64'),
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          schoolId,
          action: 'EXPORT',
          entityType: 'DataExportJob',
          entityId: exportJob.id,
          metadata: JSON.stringify({ type, format, recordCount: exportData.length, fileName }),
        },
      });

      return NextResponse.json({
        id: exportJob.id,
        type,
        format,
        fileName,
        fileSize: Buffer.byteLength(fileContent),
        recordCount: exportData.length,
        status: 'completed',
        fileData: Buffer.from(fileContent).toString('base64'),
      }, { status: 201 });
    } catch (processingError) {
      await db.dataExportJob.update({
        where: { id: exportJob.id },
        data: { status: 'failed' },
      });
      throw processingError;
    }
  } catch (error) {
    console.error('Data Export POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
