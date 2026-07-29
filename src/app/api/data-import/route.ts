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

interface ImportRow {
  [key: string]: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

function parseCsv(text: string): { headers: string[]; rows: ImportRow[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: ImportRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'students';
    const schoolId = formData.get('schoolId') as string || session.user?.schoolId;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 });
    }

    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    if (type === 'students') {
      for (const row of rows) {
        try {
          const firstName = row['First Name'] || row['firstName'] || row['Vorname'] || '';
          const lastName = row['Last Name'] || row['lastName'] || row['Nachname'] || '';
          const externalId = row['External ID'] || row['externalId'] || row['ID'] || '';
          const dateOfBirth = row['Date of Birth'] || row['dateOfBirth'] || row['Geburtsdatum'] || '';

          if (!firstName || !lastName) {
            result.skipped++;
            result.errors.push(`Row skipped: missing first/last name`);
            continue;
          }

          const existing = externalId
            ? await db.student.findFirst({ where: { externalId, schoolId, deletedAt: null } })
            : null;

          if (existing) {
            result.skipped++;
            continue;
          }

          await db.student.create({
            data: {
              schoolId,
              firstName,
              lastName,
              externalId: externalId || null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'assessments') {
      for (const row of rows) {
        try {
          const title = row['Title'] || row['title'] || row['Titel'] || '';
          const classGroupId = row['Class ID'] || row['classGroupId'] || '';
          const subjectId = row['Subject ID'] || row['subjectId'] || '';
          const date = row['Date'] || row['date'] || row['Datum'] || '';
          const assessmentType = row['Type'] || row['type'] || 'WRITTEN';

          if (!title || !classGroupId) {
            result.skipped++;
            result.errors.push(`Row skipped: missing title or class ID`);
            continue;
          }

          await db.assessment.create({
            data: {
              title,
              classGroupId,
              subjectId: subjectId || null,
              teacherId: session.userId,
              date: date ? new Date(date) : new Date(),
              type: assessmentType,
              maxScore: row['Max Score'] || row['maxScore'] ? parseFloat(row['Max Score'] || row['maxScore']) : null,
              weight: row['Weight'] || row['weight'] ? parseFloat(row['Weight'] || row['weight']) : 1.0,
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'grades') {
      for (const row of rows) {
        try {
          const studentId = row['Student ID'] || row['studentId'] || '';
          const assessmentId = row['Assessment ID'] || row['assessmentId'] || '';
          const score = row['Score'] || row['score'] || '';

          if (!studentId || !assessmentId) {
            result.skipped++;
            result.errors.push(`Row skipped: missing student ID or assessment ID`);
            continue;
          }

          await db.assessmentResult.create({
            data: {
              studentId,
              assessmentId,
              score: score ? parseFloat(score) : null,
              note: row['Note'] || row['note'] || null,
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'IMPORT',
        entityType: 'DataImport',
        entityId: null,
        metadata: JSON.stringify({ type, created: result.created, skipped: result.skipped, errorCount: result.errors.length }),
      },
    });

    return NextResponse.json({
      type,
      totalRows: rows.length,
      created: result.created,
      skipped: result.skipped,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 20),
      detectedColumns: headers,
    });
  } catch (error) {
    console.error('Data Import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'students';

    let csvContent = '';
    let filename = '';

    if (type === 'students') {
      csvContent = 'First Name,Last Name,Date of Birth,External ID\nMax,Mustermann,2015-03-15,STU001\nAnna,Schmidt,2015-07-22,STU002\n';
      filename = 'sample_students.csv';
    } else if (type === 'assessments') {
      csvContent = 'Title,Class ID,Subject ID,Date,Type,Max Score,Weight\nMath Test 1,cls_001,subj_math,2025-01-15,WRITTEN,100,1.0\nReading Test,cls_001,subj_german,2025-01-20,WRITTEN,50,1.0\n';
      filename = 'sample_assessments.csv';
    } else if (type === 'grades') {
      csvContent = 'Student ID,Assessment ID,Score,Note\nstu_001,asmt_001,85,Good work\nstu_002,asmt_001,92,Excellent\n';
      filename = 'sample_grades.csv';
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Sample CSV download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
