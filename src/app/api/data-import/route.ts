// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

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

function parseJson(text: string): { headers: string[]; rows: ImportRow[] } {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.records || data.data || [];
  if (arr.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(arr[0]);
  const rows = arr.map((item: Record<string, unknown>) => {
    const row: ImportRow = {};
    headers.forEach((h) => {
      row[h] = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
    });
    return row;
  });
  return { headers, rows };
}

export const POST = withRateLimit(async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'STUDENT';
    const schoolId = (formData.get('schoolId') as string) || session.user?.schoolId;
    const columnMapping = formData.get('columnMapping') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Create import job record
    const importJob = await db.dataImportJob.create({
      data: {
        schoolId,
        userId: session.userId,
        type,
        fileName: file.name,
        fileSize: file.size,
        status: 'processing',
      },
    });

    const text = await file.text();
    let parsed: { headers: string[]; rows: ImportRow[] };

    // Parse based on file type
    if (file.name.endsWith('.json')) {
      try {
        parsed = parseJson(text);
      } catch {
        await db.dataImportJob.update({
          where: { id: importJob.id },
          data: { status: 'failed', errors: JSON.stringify([{ error: 'Invalid JSON format' }]) },
        });
        return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
      }
    } else {
      try {
        parsed = parseCsv(text);
      } catch {
        await db.dataImportJob.update({
          where: { id: importJob.id },
          data: { status: 'failed', errors: JSON.stringify([{ error: 'Invalid CSV format' }]) },
        });
        return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 });
      }
    }

    const { headers, rows } = parsed;

    if (rows.length === 0) {
      await db.dataImportJob.update({
        where: { id: importJob.id },
        data: { status: 'failed', totalRows: 0, errors: JSON.stringify([{ error: 'No data rows found' }]) },
      });
      return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });
    }

    // Apply column mapping if provided
    let mappedRows = rows;
    if (columnMapping) {
      try {
        const mapping: Record<string, string> = JSON.parse(columnMapping);
        mappedRows = rows.map((row) => {
          const mapped: ImportRow = {};
          for (const [csvCol, dbField] of Object.entries(mapping)) {
            if (dbField && row[csvCol] !== undefined) {
              mapped[dbField] = row[csvCol];
            }
          }
          return mapped;
        });
      } catch {
        // If mapping fails, use original rows
      }
    }

    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    // Import based on type
    if (type === 'STUDENT') {
      for (const row of mappedRows) {
        try {
          const firstName = row['firstName'] || row['First Name'] || row['Vorname'] || '';
          const lastName = row['lastName'] || row['Last Name'] || row['Nachname'] || '';
          const externalId = row['externalId'] || row['External ID'] || row['ID'] || '';
          const dateOfBirth = row['dateOfBirth'] || row['Date of Birth'] || row['Geburtsdatum'] || '';
          const email = row['email'] || row['Email'] || '';

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
    } else if (type === 'TEACHER') {
      for (const row of mappedRows) {
        try {
          const firstName = row['firstName'] || row['First Name'] || row['Vorname'] || '';
          const lastName = row['lastName'] || row['Last Name'] || row['Nachname'] || '';
          const email = row['email'] || row['Email'] || '';
          const role = row['role'] || row['Role'] || 'TEACHER';

          if (!firstName || !lastName || !email) {
            result.skipped++;
            result.errors.push(`Row skipped: missing required fields`);
            continue;
          }

          const existing = await db.user.findUnique({ where: { email } });
          if (existing) {
            result.skipped++;
            continue;
          }

          await db.user.create({
            data: {
              schoolId,
              firstName,
              lastName,
              email,
              role,
              passwordHash: '$2a$10$default.placeholder.hash.value',
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'GRADE') {
      for (const row of mappedRows) {
        try {
          const studentId = row['studentId'] || row['Student ID'] || '';
          const assessmentId = row['assessmentId'] || row['Assessment ID'] || '';
          const score = row['score'] || row['Score'] || '';

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
              note: row['note'] || row['Note'] || null,
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'ATTENDANCE') {
      for (const row of mappedRows) {
        try {
          const studentId = row['studentId'] || row['Student ID'] || '';
          const date = row['date'] || row['Date'] || row['Datum'] || '';
          const status = row['status'] || row['Status'] || 'PRESENT';

          if (!studentId || !date) {
            result.skipped++;
            result.errors.push(`Row skipped: missing student ID or date`);
            continue;
          }

          await db.attendanceRecord.create({
            data: {
              studentId,
              sessionId: row['sessionId'] || row['Session ID'] || '',
              status,
              date: new Date(date),
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'COMPETENCY') {
      for (const row of mappedRows) {
        try {
          const studentId = row['studentId'] || row['Student ID'] || '';
          const competencyId = row['competencyId'] || row['Competency ID'] || '';
          const level = row['level'] || row['Level'] || '';

          if (!studentId || !competencyId) {
            result.skipped++;
            result.errors.push(`Row skipped: missing student ID or competency ID`);
            continue;
          }

          await db.learningProgressEntry.create({
            data: {
              studentId,
              competencyId,
              teacherId: session.userId,
              level: level ? parseInt(level) : 1,
              note: row['note'] || row['Note'] || null,
            },
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    // Update import job
    await db.dataImportJob.update({
      where: { id: importJob.id },
      data: {
        status: 'completed',
        totalRows: rows.length,
        successRows: result.created,
        errorRows: result.skipped + result.errors.length,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 50)) : null,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'IMPORT',
        entityType: 'DataImportJob',
        entityId: importJob.id,
        metadata: JSON.stringify({
          type,
          created: result.created,
          skipped: result.skipped,
          errorCount: result.errors.length,
          fileName: file.name,
        }),
      },
    });

    return NextResponse.json({
      id: importJob.id,
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
}, 'heavy');

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

    // For non-admin users, only show their own imports
    const where: Record<string, unknown> = { schoolId };
    if (session.user?.role === 'TEACHER') {
      where.userId = session.userId;
    }

    const jobs = await db.dataImportJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Data Import GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
