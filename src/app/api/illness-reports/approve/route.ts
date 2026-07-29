import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    if (role !== 'PARENT' && role !== 'SCHOOL_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Only parents or admins can approve' }, { status: 403 });
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

    if (report.parentApprovalStatus !== 'pending') {
      return NextResponse.json({ error: 'Report already processed' }, { status: 400 });
    }

    // Verify parent is linked to this student
    if (role === 'PARENT') {
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, studentId: report.studentId },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'You can only approve reports for your children' }, { status: 403 });
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updated = await db.illnessReport.update({
      where: { id: reportId },
      data: {
        parentApprovalStatus: newStatus,
        parentApprovedBy: userId,
        parentApprovedAt: new Date(),
        isVisibleToTeacher: newStatus === 'approved',
        isVisibleToAdmin: newStatus === 'approved',
        status: newStatus === 'approved' ? 'approved' : 'rejected',
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('IllnessReport approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
