import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/report-schedules?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const schedules = await db.reportSchedule.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('[report-schedules] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report schedules' }, { status: 500 });
  }
}

// POST /api/report-schedules
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId,
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
    } = body;

    if (!schoolId || !template || !frequency) {
      return NextResponse.json({ error: 'schoolId, template, and frequency are required' }, { status: 400 });
    }

    // Calculate nextRunAt
    const nextRunAt = calculateNextRun(frequency, dayOfWeek, dayOfMonth, monthOfYear);

    const schedule = await db.reportSchedule.create({
      data: {
        schoolId,
        classGroupId: classGroupId || null,
        template,
        frequency,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        monthOfYear: monthOfYear ?? null,
        recipients: recipients ? JSON.stringify(recipients) : null,
        includeStudents: includeStudents ?? true,
        includeGrades: includeGrades ?? true,
        includeAttendance: includeAttendance ?? true,
        includeBehavior: includeBehavior ?? false,
        includeCompetencies: includeCompetencies ?? true,
        nextRunAt,
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('[report-schedules] POST error:', error);
    return NextResponse.json({ error: 'Failed to create report schedule' }, { status: 500 });
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
      const targetDay = dayOfWeek ?? 1; // Monday default
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
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    }
    case 'quarterly': {
      const targetMonth = monthOfYear ?? 1;
      next.setMonth(targetMonth - 1);
      next.setDate(1);
      next.setHours(8, 0, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 3);
      }
      break;
    }
    case 'end_of_term': {
      // Default: July 15 (end of German school year)
      next.setMonth(6); // July
      next.setDate(15);
      next.setHours(8, 0, 0, 0);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      break;
    }
    default: {
      next.setDate(next.getDate() + 7);
      next.setHours(8, 0, 0, 0);
    }
  }

  return next;
}
