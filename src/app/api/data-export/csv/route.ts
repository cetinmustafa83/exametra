import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // Escape fields containing quotes, commas, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',');
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'students';
    const classGroupId = searchParams.get('classGroupId');
    const schoolYearId = searchParams.get('schoolYearId');
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;

    let csvContent = '';
    let filename = `${type}_export.csv`;

    if (type === 'students') {
      // Students CSV
      const where: Record<string, unknown> = { deletedAt: null };
      if (schoolId) where.schoolId = schoolId;

      let students = await db.student.findMany({
        where,
        orderBy: { lastName: 'asc' },
        include: {
          school: { select: { name: true } },
          enrollments: {
            where: classGroupId ? { classGroupId } : {},
            include: {
              classGroup: { select: { name: true, gradeLevel: true } },
            },
          },
          _count: {
            select: { learningProgressEntries: true, assessmentResults: true },
          },
        },
      });

      // Filter by school year if specified
      if (schoolYearId && !classGroupId) {
        students = students.filter((s) =>
          s.enrollments.some((e) => e.schoolYearId === schoolYearId)
        );
      } else if (classGroupId) {
        students = students.filter((s) =>
          s.enrollments.some((e) => e.classGroupId === classGroupId)
        );
      }

      const header = ['ID', 'First Name', 'Last Name', 'Date of Birth', 'External ID', 'School', 'Class', 'Grade Level', 'Progress Entries', 'Assessment Results'];
      csvContent = header.map(escapeCsvField).join(',') + '\n';

      for (const s of students) {
        const enrollment = s.enrollments[0];
        csvContent += toCsvRow([
          s.id,
          s.firstName,
          s.lastName,
          s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : '',
          s.externalId ?? '',
          s.school.name,
          enrollment?.classGroup?.name ?? '',
          enrollment?.classGroup?.gradeLevel ?? '',
          s._count.learningProgressEntries,
          s._count.assessmentResults,
        ]) + '\n';
      }

      filename = `students_export.csv`;
    } else if (type === 'progress') {
      // Progress entries CSV
      const where: Record<string, unknown> = {};
      if (classGroupId) where.classGroupId = classGroupId;

      let entries = await db.learningProgressEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          competency: {
            select: {
              id: true,
              code: true,
              title: true,
              category: { select: { id: true, name: true } },
            },
          },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          classGroup: { select: { id: true, name: true } },
        },
      });

      // Filter by school year through classGroup
      if (schoolYearId) {
        const classGroups = await db.classGroup.findMany({
          where: { schoolYearId },
          select: { id: true },
        });
        const classIds = classGroups.map((c) => c.id);
        entries = entries.filter((e) => classIds.includes(e.classGroupId));
      }

      // Filter by school
      if (schoolId) {
        const classGroups = await db.classGroup.findMany({
          where: { schoolId },
          select: { id: true },
        });
        const classIds = classGroups.map((c) => c.id);
        entries = entries.filter((e) => classIds.includes(e.classGroupId));
      }

      const header = ['ID', 'Date', 'Student First Name', 'Student Last Name', 'Student ID', 'Competency Code', 'Competency Title', 'Category', 'Mastery Level', 'Note', 'Teacher', 'Class'];
      csvContent = header.map(escapeCsvField).join(',') + '\n';

      for (const e of entries) {
        csvContent += toCsvRow([
          e.id,
          new Date(e.date).toLocaleDateString(),
          e.student.firstName,
          e.student.lastName,
          e.student.id,
          e.competency.code,
          e.competency.title,
          e.competency.category.name,
          e.masteryLevelValue,
          e.note ?? '',
          `${e.teacher.firstName} ${e.teacher.lastName}`,
          e.classGroup.name,
        ]) + '\n';
      }

      filename = `progress_export.csv`;
    } else if (type === 'assessments') {
      // Assessments CSV
      const where: Record<string, unknown> = {};
      if (classGroupId) where.classGroupId = classGroupId;

      let assessments = await db.assessment.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          classGroup: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          assessmentResults: {
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      if (schoolYearId) {
        const classGroups = await db.classGroup.findMany({
          where: { schoolYearId },
          select: { id: true },
        });
        const classIds = classGroups.map((c) => c.id);
        assessments = assessments.filter((a) => classIds.includes(a.classGroupId));
      }

      if (schoolId) {
        const classGroups = await db.classGroup.findMany({
          where: { schoolId },
          select: { id: true },
        });
        const classIds = classGroups.map((c) => c.id);
        assessments = assessments.filter((a) => classIds.includes(a.classGroupId));
      }

      const header = ['Assessment ID', 'Title', 'Date', 'Type', 'Subject', 'Class', 'Teacher', 'Max Score', 'Weight', 'Student ID', 'Student Name', 'Score', 'Mastery Level', 'Note'];
      csvContent = header.map(escapeCsvField).join(',') + '\n';

      for (const a of assessments) {
        if (a.assessmentResults.length === 0) {
          csvContent += toCsvRow([
            a.id, a.title, new Date(a.date).toLocaleDateString(), a.type,
            a.subject.name, a.classGroup.name,
            `${a.teacher.firstName} ${a.teacher.lastName}`,
            a.maxScore ?? '', a.weight, '', '', '', '', '',
          ]) + '\n';
        } else {
          for (const r of a.assessmentResults) {
            csvContent += toCsvRow([
              a.id, a.title, new Date(a.date).toLocaleDateString(), a.type,
              a.subject.name, a.classGroup.name,
              `${a.teacher.firstName} ${a.teacher.lastName}`,
              a.maxScore ?? '', a.weight,
              r.studentId, `${r.student.firstName} ${r.student.lastName}`,
              r.score ?? '', r.masteryLevelValue ?? '', r.note ?? '',
            ]) + '\n';
          }
        }
      }

      filename = `assessments_export.csv`;
    } else if (type === 'grades') {
      // Grades CSV
      const where: Record<string, unknown> = {};
      if (classGroupId) where.classGroupId = classGroupId;
      if (schoolYearId) where.schoolYearId = schoolYearId;

      let grades = await db.computedGrade.findMany({
        where,
        orderBy: [{ student: { lastName: 'asc' } }],
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
          schoolYear: { select: { id: true, label: true } },
        },
      });

      if (schoolId && !classGroupId) {
        const classGroups = await db.classGroup.findMany({
          where: { schoolId },
          select: { id: true },
        });
        const classIds = classGroups.map((c) => c.id);
        grades = grades.filter((g) => classIds.includes(g.classGroupId));
      }

      const header = ['Student ID', 'Student First Name', 'Student Last Name', 'Subject', 'Class', 'School Year', 'Period', 'Computed Value', 'Overridden Value', 'Override Reason', 'Finalized'];
      csvContent = header.map(escapeCsvField).join(',') + '\n';

      for (const g of grades) {
        csvContent += toCsvRow([
          g.studentId, g.student.firstName, g.student.lastName,
          g.subject.name, g.classGroup.name, g.schoolYear.label,
          g.period, g.computedValue.toFixed(2),
          g.overriddenValue?.toFixed(2) ?? '', g.overrideReason ?? '',
          g.isFinalized ? 'Yes' : 'No',
        ]) + '\n';
      }

      filename = `grades_export.csv`;
    }

    // Create audit log for export
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'EXPORT',
        entityType: 'DataExport',
        entityId: null,
        metadata: JSON.stringify({ type, classGroupId, schoolYearId }),
      },
    });

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
