import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canApproveTeacherLeave, canCreateTeacherLeaveCalendarEvent } from '@/lib/teacher-leave-policy';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canApproveTeacherLeave(session.user?.role)) {
    return NextResponse.json({ error: 'Only administrators can approve teacher leave' }, { status: 403 });
  }

  const { id } = await params;
  const { action, privateAdminNotes } = await request.json();
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const absence = await db.teacherAbsence.findUnique({ where: { id } });
  if (!absence) return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
  if (session.user?.role !== 'SUPER_ADMIN' && absence.schoolId !== session.user?.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (absence.approvalStatus !== 'pending') {
    return NextResponse.json({ error: 'Leave request already processed' }, { status: 400 });
  }

  const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
  const updated = await db.teacherAbsence.update({
    where: { id },
    data: {
      approvalStatus,
      approvedBy: session.userId,
      approvedAt: new Date(),
      privateAdminNotes: privateAdminNotes || null,
      status: approvalStatus === 'approved' ? 'reported' : 'cancelled',
    },
  });

  if (canCreateTeacherLeaveCalendarEvent(updated)) {
    const event = await db.calendarEvent.create({
      data: {
        schoolId: updated.schoolId,
        teacherId: updated.teacherId,
        title: 'Approved teacher leave',
        date: updated.startDate,
        eventType: 'teacher_leave',
        notes: null,
        allDay: true,
      },
    });
    await db.teacherAbsence.update({ where: { id }, data: { calendarEventId: event.id } });
  }

  return NextResponse.json(updated);
}
