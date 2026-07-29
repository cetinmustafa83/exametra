import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/report-schedules/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const schedule = await db.reportSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        school: { select: { id: true, name: true } },
      },
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('[report-schedules/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

// PUT /api/report-schedules/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      classGroupId,
      template,
      frequency,
      dayOfWeek,
      dayOfMonth,
      monthOfYear,
      recipients,
      includeStudents,
      includeGrades,
      includeAttendance,
      includeBehavior,
      includeCompetencies,
      isActive,
    } = body;

    const data: Record<string, unknown> = {};
    if (classGroupId !== undefined) data.classGroupId = classGroupId || null;
    if (template !== undefined) data.template = template;
    if (frequency !== undefined) data.frequency = frequency;
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) data.dayOfMonth = dayOfMonth;
    if (monthOfYear !== undefined) data.monthOfYear = monthOfYear;
    if (recipients !== undefined) data.recipients = recipients ? JSON.stringify(recipients) : null;
    if (includeStudents !== undefined) data.includeStudents = includeStudents;
    if (includeGrades !== undefined) data.includeGrades = includeGrades;
    if (includeAttendance !== undefined) data.includeAttendance = includeAttendance;
    if (includeBehavior !== undefined) data.includeBehavior = includeBehavior;
    if (includeCompetencies !== undefined) data.includeCompetencies = includeCompetencies;
    if (isActive !== undefined) data.isActive = isActive;

    // Recalculate nextRunAt if frequency or timing changed
    if (frequency || dayOfWeek !== undefined || dayOfMonth !== undefined || monthOfYear !== undefined) {
      const current = await db.reportSchedule.findUnique({ where: { id } });
      if (current) {
        const freq = frequency || current.frequency;
        const dow = dayOfWeek !== undefined ? dayOfWeek : current.dayOfWeek;
        const dom = dayOfMonth !== undefined ? dayOfMonth : current.dayOfMonth;
        const moy = monthOfYear !== undefined ? monthOfYear : current.monthOfYear;
        data.nextRunAt = calculateNextRun(freq, dow, dom, moy);
      }
    }

    const schedule = await db.reportSchedule.update({
      where: { id },
      data,
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('[report-schedules/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// DELETE /api/report-schedules/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.reportSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[report-schedules/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}

function calculateNextRun(
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  monthOfYear?: number | null,
): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case 'weekly': {
      const targetDay = dayOfWeek ?? 1;
      const currentDay = next.getDay();
      const daysUntil = ((targetDay - currentDay + 7) % 7) || 7;
      next.setDate(next.getDate() + daysUntil);
      next.setHours(8, 0, 0, 0);
      break;
    }
    case 'monthly': {
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      next.setHours(8, 0, 0, 0);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      break;
    }
    case 'quarterly': {
      const targetMonth = monthOfYear ?? 1;
      next.setMonth(targetMonth - 1);
      next.setDate(1);
      next.setHours(8, 0, 0, 0);
      if (next <= now) next.setMonth(next.getMonth() + 3);
      break;
    }
    case 'end_of_term': {
      next.setMonth(6);
      next.setDate(15);
      next.setHours(8, 0, 0, 0);
      if (next <= now) next.setFullYear(next.getFullYear() + 1);
      break;
    }
    default: {
      next.setDate(next.getDate() + 7);
      next.setHours(8, 0, 0, 0);
    }
  }
  return next;
}
