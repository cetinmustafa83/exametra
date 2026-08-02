import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAdminApprove, canCreateCalendarEvent, canParentApprove } from '@/lib/leave-policy';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    if (!canParentApprove(role) && !canAdminApprove(role)) {
      return NextResponse.json({ error: 'Only parents or administrators can approve leave requests' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, action } = body; // action: "approve" or "reject"

    if (!reportId || !action) {
      return NextResponse.json({ error: 'reportId and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }

    const report = await db.illnessReport.findUnique({ where: { id: reportId } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (role === 'PARENT') {
      if (report.parentApprovalStatus !== 'pending') {
        return NextResponse.json({ error: 'Parent approval has already been processed' }, { status: 400 });
      }
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, studentId: report.studentId },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'You can only approve reports for your children' }, { status: 403 });
      }
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updated = await db.illnessReport.update({
        where: { id: reportId },
        data: {
          parentApprovalStatus: newStatus,
          parentApprovedBy: userId,
          parentApprovedAt: new Date(),
          isVisibleToTeacher: newStatus === 'approved',
          status: newStatus === 'approved' ? 'pending' : 'rejected',
        },
        include: { student: { include: { enrollments: { where: { endDate: null }, include: { classGroup: { select: { responsibleTeacherId: true } } }, take: 1 } } } },
      });

      if (newStatus === 'approved') {
        const teacherId = updated.student.enrollments[0]?.classGroup.responsibleTeacherId;
        if (teacherId) {
          await db.notification.create({
            data: {
              schoolId: updated.schoolId,
              userId: teacherId,
              type: 'LEAVE_PARENT_APPROVED',
              category: 'administrative',
              title: 'Student leave request approved by parent',
              message: `${updated.student.firstName} ${updated.student.lastName} has an approved leave request awaiting administration approval.`,
              relatedId: updated.id,
            },
          });
          await db.illnessReport.update({ where: { id: updated.id }, data: { teacherNotifiedAt: new Date() } });
        }
      }
      return NextResponse.json(updated);
    }

    if (report.parentApprovalStatus !== 'approved' || report.adminApprovalStatus !== 'pending') {
      return NextResponse.json({ error: 'This request is not ready for administrator approval' }, { status: 400 });
    }
    if (session.user?.schoolId && report.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = await db.illnessReport.update({
      where: { id: reportId },
      data: {
        adminApprovalStatus: adminStatus,
        adminApprovedBy: userId,
        adminApprovedAt: new Date(),
        isVisibleToAdmin: true,
        status: adminStatus,
      },
      include: {
        student: { include: { enrollments: { where: { endDate: null }, include: { classGroup: true }, take: 1 } } },
      },
    });

    if (canCreateCalendarEvent(updated)) {
      const classGroup = updated.student.enrollments[0]?.classGroup;
      const event = await db.calendarEvent.create({
        data: {
          schoolId: updated.schoolId,
          teacherId: userId,
          title: `${updated.student.firstName} ${updated.student.lastName}: approved leave`,
          date: updated.startDate,
          eventType: 'leave',
          classGroupId: classGroup?.id ?? null,
          notes: `Leave type: ${updated.leaveType}`,
          allDay: true,
        },
      });
      await db.illnessReport.update({ where: { id: updated.id }, data: { calendarEventId: event.id } });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('IllnessReport approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
