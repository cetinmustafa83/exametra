import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const statusEnum = z.enum(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']);

const createSessionSchema = z.object({
  classGroupId: z.string().min(1),
  date: z.string().min(1),
  subjectId: z.string().optional(),
  period: z.string().optional(),
});

const updateSessionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['OPEN', 'COMPLETED']).optional(),
  records: z.array(z.object({
    id: z.string().min(1),
    status: statusEnum.optional(),
    arrivalTime: z.string().optional(),
    comment: z.string().optional(),
  })).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const isTeacherOrAdmin = role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';

    const { searchParams } = new URL(request.url);
    const classGroupId = searchParams.get('classGroupId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');

    if (!classGroupId) {
      return NextResponse.json({ error: 'classGroupId is required' }, { status: 400 });
    }

    // Verify class belongs to user's school
    const classGroup = await db.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true, schoolId: true },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      classGroup.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Students can only view their own attendance records
    if (role === 'STUDENT') {
      // Find the student record matching this user (by name + school)
      const studentRecord = await db.student.findFirst({
        where: {
          schoolId: session.user.schoolId ?? undefined,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          deletedAt: null,
        },
      });
      if (!studentRecord) {
        // No student record found for this user - return empty
        return NextResponse.json([]);
      }
      // Verify the student is enrolled in this class
      const enrollment = await db.enrollment.findFirst({
        where: { classGroupId, studentId: studentRecord.id, endDate: null },
      });
      if (!enrollment) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Parents can view attendance if they have a child in the class
    if (role === 'PARENT') {
      const childEnrollment = await db.enrollment.findFirst({
        where: { classGroupId, endDate: null },
        include: {
          student: {
            include: {
              parentLinks: { where: { parentId: session.userId } },
            },
          },
        },
      });
      if (!childEnrollment || childEnrollment.student.parentLinks.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const where: Record<string, unknown> = { classGroupId };
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }
    if (status) {
      where.status = status;
    }

    const sessions = await db.attendanceSession.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        records: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });

    // For students, filter records to only show their own
    if (role === 'STUDENT') {
      const studentRecord = await db.student.findFirst({
        where: {
          schoolId: session.user.schoolId ?? undefined,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          deletedAt: null,
        },
      });
      const studentId = studentRecord?.id ?? '';
      const filteredSessions = sessions.map((s) => ({
        ...s,
        records: s.records.filter((r) => r.studentId === studentId),
      }));
      return NextResponse.json(filteredSessions);
    }

    // For parents, filter records to only show their children's
    if (role === 'PARENT') {
      const childIds = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const childIdSet = new Set(childIds.map((c) => c.studentId));
      const filteredSessions = sessions.map((s) => ({
        ...s,
        records: s.records.filter((r) => childIdSet.has(r.studentId)),
      }));
      return NextResponse.json(filteredSessions);
    }

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { classGroupId, date, subjectId, period } = parsed.data;

    // Verify class exists
    const classGroup = await db.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true, schoolId: true },
    });

    if (!classGroup) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      classGroup.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all enrolled students for the class
    const enrollments = await db.enrollment.findMany({
      where: {
        classGroupId,
        endDate: null,
      },
      select: { studentId: true },
    });

    // Create the session with records for all students
    const attendanceSession = await db.attendanceSession.create({
      data: {
        classGroupId,
        teacherId: session.userId,
        date: new Date(date),
        subjectId: subjectId || null,
        period: period || null,
        status: 'OPEN',
        records: {
          create: enrollments.map((e) => ({
            studentId: e.studentId,
            status: 'PRESENT',
          })),
        },
      },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        records: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: classGroup.schoolId,
        action: 'CREATE',
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        metadata: JSON.stringify({
          classGroupId,
          date,
          studentCount: enrollments.length,
        }),
      },
    });

    return NextResponse.json(attendanceSession, { status: 201 });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    const existing = await db.attendanceSession.findUnique({
      where: { id },
      include: { classGroup: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isTeacher = existing.teacherId === session.userId;
    const isSchoolAdmin =
      session.user?.role === 'SCHOOL_ADMIN' &&
      session.user.schoolId &&
      existing.classGroup.schoolId === session.user.schoolId;
    const isSuperAdmin = session.user?.role === 'SUPER_ADMIN';

    if (!isTeacher && !isSchoolAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update session status if provided
    if (parsed.data.status !== undefined) {
      await db.attendanceSession.update({
        where: { id },
        data: { status: parsed.data.status },
      });
    }

    // Update records if provided
    if (parsed.data.records && parsed.data.records.length > 0) {
      for (const record of parsed.data.records) {
        const updateData: Record<string, unknown> = {};
        if (record.status !== undefined) updateData.status = record.status;
        if (record.arrivalTime !== undefined) updateData.arrivalTime = record.arrivalTime;
        if (record.comment !== undefined) updateData.comment = record.comment;

        if (Object.keys(updateData).length > 0) {
          await db.attendanceRecord.update({
            where: { id: record.id },
            data: updateData,
          });
        }
      }
    }

    // Return updated session
    const updated = await db.attendanceSession.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        records: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: existing.classGroup.schoolId,
        action: 'UPDATE',
        entityType: 'AttendanceSession',
        entityId: id,
        metadata: JSON.stringify({
          status: parsed.data.status,
          recordsUpdated: parsed.data.records?.length ?? 0,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Attendance PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
