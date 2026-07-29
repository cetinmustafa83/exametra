import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get single exam plan ──────────────────────────────────────────
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

    const examPlan = await db.examPlan.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        calendarEvent: { select: { id: true } },
        assessment: { select: { id: true, title: true } },
      },
    });

    if (!examPlan) {
      return NextResponse.json({ error: 'Exam plan not found' }, { status: 404 });
    }

    // Role-based access check
    if (
      session.user?.role === 'STUDENT' ||
      session.user?.role === 'PARENT'
    ) {
      // Students and parents can view but not modify
    } else if (session.user?.role === 'TEACHER') {
      // Teachers can only view their own exams
      if (examPlan.teacherId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(examPlan);
  } catch (error) {
    console.error('ExamPlan GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update exam plan ──────────────────────────────────────────────
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
    const userRole = session.user?.role;

    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await db.examPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Exam plan not found' }, { status: 404 });
    }

    // Teachers can only edit their own exams
    if (userRole === 'TEACHER' && existing.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      date,
      startTime,
      endTime,
      subjectId,
      classGroupId,
      room,
      topics,
      weight,
      status,
      notes,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime || null;
    if (endTime !== undefined) updateData.endTime = endTime || null;
    if (subjectId !== undefined) updateData.subjectId = subjectId;
    if (classGroupId !== undefined) updateData.classGroupId = classGroupId;
    if (room !== undefined) updateData.room = room || null;
    if (topics !== undefined) updateData.topics = topics ? JSON.stringify(topics) : null;
    if (weight !== undefined) updateData.weight = weight;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;

    const updated = await db.examPlan.update({
      where: { id },
      data: updateData,
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        calendarEvent: { select: { id: true } },
        assessment: { select: { id: true, title: true } },
      },
    });

    // Also update the linked CalendarEvent
    if (existing.calendarEventId) {
      const calendarUpdateData: Record<string, unknown> = {};
      if (title !== undefined) calendarUpdateData.title = `[Exam] ${title}`;
      if (date !== undefined) calendarUpdateData.date = new Date(date);
      if (startTime !== undefined) calendarUpdateData.startTime = startTime || null;
      if (endTime !== undefined) calendarUpdateData.endTime = endTime || null;
      if (subjectId !== undefined) calendarUpdateData.subjectId = subjectId;
      if (classGroupId !== undefined) calendarUpdateData.classGroupId = classGroupId;
      if (notes !== undefined) calendarUpdateData.notes = notes || null;
      if (startTime !== undefined || endTime !== undefined) {
        calendarUpdateData.allDay = !startTime && !endTime;
      }

      if (Object.keys(calendarUpdateData).length > 0) {
        await db.calendarEvent.update({
          where: { id: existing.calendarEventId },
          data: calendarUpdateData,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('ExamPlan PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete exam plan ───────────────────────────────────────────
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
    const userRole = session.user?.role;

    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await db.examPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Exam plan not found' }, { status: 404 });
    }

    // Teachers can only delete their own exams
    if (userRole === 'TEACHER' && existing.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the linked CalendarEvent first
    if (existing.calendarEventId) {
      await db.calendarEvent.delete({ where: { id: existing.calendarEventId } }).catch(() => {});
    }

    await db.examPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ExamPlan DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
