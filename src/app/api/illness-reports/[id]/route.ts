// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const report = await db.illnessReport.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    // Access control
    if (role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: {
          OR: [
            { userId },
            { userId: null, firstName: session.user?.firstName, lastName: session.user?.lastName, schoolId: session.user?.schoolId },
          ],
        },
        select: { id: true },
      });
      if (!student || student.id !== report.studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'PARENT') {
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, studentId: report.studentId },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'TEACHER') {
      if (!report.isVisibleToTeacher) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      if (!report.isVisibleToAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('IllnessReport GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const report = await db.illnessReport.findUnique({ where: { id } });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;
    const body = await request.json();

    // Parent approval remains parent-only. Final approval is handled by /approve.
    if (body.parentApprovalStatus && role === 'PARENT') {
      const newStatus = body.parentApprovalStatus;
      if (newStatus !== 'approved' && newStatus !== 'rejected') {
        return NextResponse.json({ error: 'Invalid approval status' }, { status: 400 });
      }

      if (role === 'PARENT') {
        const parentLink = await db.parentStudentLink.findFirst({
          where: { parentId: userId, studentId: report.studentId },
        });
        if (!parentLink) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const updated = await db.illnessReport.update({
        where: { id },
        data: {
          parentApprovalStatus: newStatus,
          parentApprovedBy: userId,
          parentApprovedAt: new Date(),
          isVisibleToTeacher: newStatus === 'approved',
          isVisibleToAdmin: false,
          status: newStatus === 'approved' ? 'pending' : 'rejected',
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // STUDENT can update own pending reports (before parent approval)
    if (role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: {
          OR: [
            { userId },
            { userId: null, firstName: session.user?.firstName, lastName: session.user?.lastName, schoolId: session.user?.schoolId },
          ],
        },
        select: { id: true },
      });
      if (!student || student.id !== report.studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (report.parentApprovalStatus !== 'pending') {
        return NextResponse.json({ error: 'Cannot update report after parent approval' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (body.reason) updateData.reason = body.reason;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.startDate) updateData.startDate = new Date(body.startDate);
      if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
      if (body.documentUrl !== undefined) updateData.documentUrl = body.documentUrl;

      const updated = await db.illnessReport.update({
        where: { id },
        data: updateData,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('IllnessReport PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const report = await db.illnessReport.findUnique({ where: { id } });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    // Only the reporter or admin can delete
    if (role !== 'SUPER_ADMIN' && role !== 'SCHOOL_ADMIN' && role !== 'VICE_PRINCIPAL') {
      if (report.reportedBy !== userId) {
        return NextResponse.json({ error: 'Only the reporter or admin can delete' }, { status: 403 });
      }
    }

    await db.illnessReport.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('IllnessReport DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
