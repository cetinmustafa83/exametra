// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRateLimit } from '@/lib/rate-limit';
import { deleteStorageFile, readStorageFile, writeStorageFile } from '@/lib/storage';

// GET /api/backup — List backups for a school
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }
    const backups = await db.backup.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(backups);
  } catch (error) {
    console.error('Backup list error:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

// POST /api/backup — Create a new backup or restore from backup
export const POST = withRateLimit(async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolId, action, backupId, notes } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Restore from backup
    if (action === 'restore') {
      if (!backupId) {
        return NextResponse.json({ error: 'backupId is required for restore' }, { status: 400 });
      }
      const backup = await db.backup.findUnique({ where: { id: backupId } });
      if (!backup || backup.status !== 'completed') {
        return NextResponse.json({ error: 'Backup not found or not completed' }, { status: 404 });
      }
      const content = await readStorageFile('backups', `${backup.schoolId}/${backup.filename}`);
      return NextResponse.json({
        message: 'Backup file verified. Restore must run in a disposable maintenance environment.',
        backup,
        bytes: content.byteLength,
      });
    }

    // Create a new backup — export entire DB as JSON
    const filename = `backup_${schoolId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    // Collect all data for this school
    const [
      school,
      users,
      schoolYears,
      classGroups,
      students,
      subjects,
      competencyTemplates,
      gradingSchemes,
      assessments,
      learningProgress,
      attendance,
      notifications,
      calendarEvents,
    ] = await Promise.all([
      db.school.findUnique({ where: { id: schoolId } }),
      db.user.findMany({ where: { schoolId } }),
      db.schoolYear.findMany({ where: { schoolId } }),
      db.classGroup.findMany({ where: { schoolId } }),
      db.student.findMany({ where: { schoolId } }),
      db.subject.findMany({ where: { schoolId } }),
      db.competencyTemplate.findMany({ where: { schoolId } }),
      db.gradingScheme.findMany({ where: { schoolId } }),
      db.assessment.findMany({
        where: { classGroup: { schoolId } },
      }),
      db.learningProgressEntry.findMany({
        where: { student: { schoolId } },
      }),
      db.attendanceSession.findMany({
        where: { student: { schoolId } },
      }),
      db.notification.findMany({ where: { schoolId } }),
      db.calendarEvent.findMany({ where: { schoolId } }),
    ]);

    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      school,
      users,
      schoolYears,
      classGroups,
      students,
      subjects,
      competencyTemplates,
      gradingSchemes,
      assessments,
      learningProgress,
      attendance,
      notifications,
      calendarEvents,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const size = Buffer.byteLength(jsonStr, 'utf-8');
    await writeStorageFile('backups', `${schoolId}/${filename}`, jsonStr);

    const backup = await db.backup.create({
      data: {
        schoolId,
        filename,
        size,
        type: 'full',
        status: 'completed',
        notes: notes || `Full backup created on ${new Date().toLocaleDateString()}`,
      },
    });

    return NextResponse.json({
      ...backup,
    });
  } catch (error) {
    console.error('Backup create error:', error);
    // Try to mark any pending backup as failed
    try {
      const body = await new Request(req.clone()).json().catch(() => ({}));
      if (body.schoolId) {
        const pending = await db.backup.findFirst({
          where: { schoolId: body.schoolId, status: 'pending' },
          orderBy: { createdAt: 'desc' },
        });
        if (pending) {
          await db.backup.update({ where: { id: pending.id }, data: { status: 'failed' } });
        }
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}, 'heavy');

// DELETE /api/backup — Delete a backup
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }
    await deleteStorageFile('backups', `${backup.schoolId}/${backup.filename}`);
    await db.backup.delete({ where: { id } });
    return NextResponse.json({ message: 'Backup deleted' });
  } catch (error) {
    console.error('Backup delete error:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
