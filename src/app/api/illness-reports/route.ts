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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const parentApprovalStatus = searchParams.get('parentApprovalStatus');

    const role = session.user?.role;
    const userId = session.userId;

    const where: Record<string, unknown> = {};

    if (role === 'STUDENT') {
      // Students can only see their own reports
      const student = await db.student.findFirst({
        where: {
          OR: [
            { userId },
            {
              userId: null,
              firstName: session.user?.firstName,
              lastName: session.user?.lastName,
              schoolId: session.user?.schoolId,
            },
          ],
        },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json([]);
      }
      where.studentId = student.id;
    } else if (role === 'PARENT') {
      // Parents can see reports for their children
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: userId },
        select: { studentId: true },
      });
      const childIds = parentLinks.map((l) => l.studentId);
      if (childIds.length === 0) {
        return NextResponse.json([]);
      }
      where.studentId = { in: childIds };
    } else if (role === 'TEACHER') {
      // Teachers can only see approved reports
      where.isVisibleToTeacher = true;
      where.schoolId = session.user?.schoolId;
    } else if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      // Admin can see all approved reports
      where.isVisibleToAdmin = true;
      where.schoolId = session.user?.schoolId;
    } else if (role === 'SUPER_ADMIN') {
      // Super admin can see all
    }

    if (studentId) {
      if (role === 'STUDENT' && where.studentId !== studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (role === 'PARENT') {
        const linked = await db.parentStudentLink.findFirst({ where: { parentId: userId, studentId }, select: { id: true } });
        if (!linked) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.studentId = studentId;
    }
    if (status) where.status = status;
    if (parentApprovalStatus) where.parentApprovalStatus = parentApprovalStatus;

    const reports = await db.illnessReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('IllnessReport GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    if (role !== 'STUDENT' && role !== 'PARENT') {
      return NextResponse.json({ error: 'Only students and parents can report illness' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, reason, description, startDate, endDate, documentUrl, leaveType = 'illness' } = body;

    if (!studentId || !reason || !startDate) {
      return NextResponse.json(
        { error: 'studentId, reason, and startDate are required' },
        { status: 400 }
      );
    }

    // Verify the student exists and belongs to the same school
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, userId: true, firstName: true, lastName: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Authorization checks
    if (role === 'STUDENT') {
      const isOwnStudent =
        student.userId === userId ||
        (student.userId === null &&
          student.firstName === session.user?.firstName &&
          student.lastName === session.user?.lastName &&
          student.schoolId === session.user?.schoolId);
      if (!isOwnStudent) {
        return NextResponse.json({ error: 'You can only report illness for yourself' }, { status: 403 });
      }
    } else if (role === 'PARENT') {
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, studentId },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'You can only report illness for your children' }, { status: 403 });
      }
    }

    const reporterType = role === 'STUDENT' ? 'student' : 'parent';
    const isParentReport = reporterType === 'parent';

    // Both student and parent requests require the final administrator approval.
    // Parent-submitted requests satisfy the parent approval step immediately.
    const report = await db.illnessReport.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        reportedBy: userId,
        reporterType,
        reason,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        documentUrl: documentUrl || null,
        leaveType,
        parentApprovalStatus: isParentReport ? 'approved' : 'pending',
        parentApprovedBy: isParentReport ? userId : null,
        parentApprovedAt: isParentReport ? new Date() : null,
        isVisibleToTeacher: isParentReport,
        isVisibleToAdmin: false,
        adminApprovalStatus: 'pending',
        status: 'pending',
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('IllnessReport POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
