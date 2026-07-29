import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/report-schedules/[id]/run — trigger manual run
export async function POST(
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

    // Mark as run and calculate next run
    const now = new Date();
    const nextRunAt = calculateNextRun(
      schedule.frequency,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
      schedule.monthOfYear,
    );

    await db.reportSchedule.update({
      where: { id },
      data: { lastRunAt: now, nextRunAt },
    });

    // In a real system, this would trigger the actual report generation pipeline
    // and send notifications to recipients. For now, we simulate success.
    const recipientIds: string[] = schedule.recipients
      ? JSON.parse(schedule.recipients)
      : [];

    // Create notifications for recipients
    if (recipientIds.length > 0) {
      try {
        await db.notification.createMany({
          data: recipientIds.map((userId) => ({
            schoolId: schedule.schoolId,
            userId,
            type: 'report_ready',
            title: `Scheduled Report Generated`,
            message: `Report schedule "${schedule.template}" for ${schedule.classGroup?.name ?? 'all classes'} has been generated.`,
            actionUrl: '/reports',
            relatedId: schedule.id,
          })),
        });
      } catch {
        // Notification creation is non-critical
      }
    }

    return NextResponse.json({
      success: true,
      lastRunAt: now,
      nextRunAt,
      recipientsNotified: recipientIds.length,
    });
  } catch (error) {
    console.error('[report-schedules/[id]/run] POST error:', error);
    return NextResponse.json({ error: 'Failed to run schedule' }, { status: 500 });
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
