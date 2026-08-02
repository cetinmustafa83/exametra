// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Get database statistics
    const [
      studentCount,
      teacherCount,
      gradeCount,
      attendanceCount,
      competencyCount,
      classCount,
      subjectCount,
      assessmentCount,
      reportCount,
      orphanedStudents,
      orphanedEnrollments,
    ] = await Promise.all([
      db.student.count({ where: { schoolId, deletedAt: null } }),
      db.user.count({ where: { schoolId, deletedAt: null, role: 'TEACHER' } }),
      db.assessmentResult.count({
        where: { assessment: { classGroup: { schoolId } } },
      }),
      db.attendanceRecord.count({
        where: { student: { schoolId, deletedAt: null } },
      }),
      db.learningProgressEntry.count({
        where: { student: { schoolId, deletedAt: null } },
      }),
      db.classGroup.count({ where: { schoolId } }),
      db.subject.count({ where: { schoolId } }),
      db.assessment.count({ where: { classGroup: { schoolId } } }),
      db.report.count({ where: { schoolId } }),
      // Orphaned students: students without enrollments
      db.student.count({
        where: {
          schoolId,
          deletedAt: null,
          enrollments: { none: {} },
        },
      }),
      // Orphaned enrollments: enrollments pointing to deleted students
      db.enrollment.count({
        where: {
          student: { deletedAt: { not: null } },
        },
      }),
    ]);

    return NextResponse.json({
      statistics: {
        students: studentCount,
        teachers: teacherCount,
        grades: gradeCount,
        attendance: attendanceCount,
        competencies: competencyCount,
        classes: classCount,
        subjects: subjectCount,
        assessments: assessmentCount,
        reports: reportCount,
        total: studentCount + teacherCount + gradeCount + attendanceCount + competencyCount,
      },
      cleanup: {
        orphanedStudents,
        orphanedEnrollments,
        totalOrphans: orphanedStudents + orphanedEnrollments,
      },
    });
  } catch (error) {
    console.error('Data Cleanup GET error:', error);
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
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { operation, schoolId: bodySchoolId } = body as {
      operation: string;
      schoolId?: string;
    };

    const schoolId = bodySchoolId || session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    let result: Record<string, unknown> = {};

    if (operation === 'remove_orphans') {
      // Remove orphaned enrollments (enrollments pointing to deleted students)
      const deletedEnrollments = await db.enrollment.deleteMany({
        where: {
          student: { deletedAt: { not: null } },
        },
      });

      // Remove orphaned attendance records
      const deletedAttendance = await db.attendanceRecord.deleteMany({
        where: {
          student: { deletedAt: { not: null } },
        },
      });

      // Remove orphaned learning progress entries
      const deletedProgress = await db.learningProgressEntry.deleteMany({
        where: {
          student: { deletedAt: { not: null } },
        },
      });

      result = {
        deletedEnrollments: deletedEnrollments.count,
        deletedAttendance: deletedAttendance.count,
        deletedProgress: deletedProgress.count,
        totalDeleted: deletedEnrollments.count + deletedAttendance.count + deletedProgress.count,
      };
    } else if (operation === 'bulk_delete') {
      const { type, ids } = body as { type: string; ids: string[] };

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
      }

      let deleted = 0;

      if (type === 'STUDENT') {
        const res = await db.student.updateMany({
          where: { id: { in: ids }, schoolId },
          data: { deletedAt: new Date() },
        });
        deleted = res.count;
      } else if (type === 'ASSESSMENT') {
        const res = await db.assessment.deleteMany({
          where: { id: { in: ids }, classGroup: { schoolId } },
        });
        deleted = res.count;
      } else if (type === 'REPORT') {
        const res = await db.report.deleteMany({
          where: { id: { in: ids }, schoolId },
        });
        deleted = res.count;
      }

      result = { type, deleted };
    } else if (operation === 'backup') {
      // Create a simple backup by counting all records
      const tables = {
        schools: await db.school.count(),
        users: await db.user.count(),
        students: await db.student.count({ where: { deletedAt: null } }),
        classes: await db.classGroup.count(),
        subjects: await db.subject.count(),
        assessments: await db.assessment.count(),
        reports: await db.report.count(),
      };

      result = {
        backup: true,
        timestamp: new Date().toISOString(),
        tables,
        message: 'Backup metadata recorded. Full database backup requires server-side access.',
      };
    } else {
      return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: operation.toUpperCase(),
        entityType: 'DataCleanup',
        entityId: null,
        metadata: JSON.stringify(result),
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Data Cleanup POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
