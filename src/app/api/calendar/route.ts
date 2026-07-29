import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/* ── helpers ──────────────────────────────────────────────────────── */

type EventType = 'assessment' | 'attendance' | 'progress' | 'report' | 'lesson';

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: EventType;
  id: string;
  title: string;
  meta: Record<string, unknown>;
}

/** Format a Date (or ISO string) as YYYY-MM-DD in UTC to avoid TZ drift. */
function toDayKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const monthParam = searchParams.get('month'); // YYYY-MM

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required (pass as query param or have a school assigned to user)' },
        { status: 400 }
      );
    }

    // Parse month, default to current month
    let year: number;
    let monthIndex: number; // 0-based
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [yStr, mStr] = monthParam.split('-');
      year = parseInt(yStr, 10);
      monthIndex = parseInt(mStr, 10) - 1;
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthIndex = now.getUTCMonth();
    }

    // Build a UTC-based month range so it's timezone-stable
    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const dateRange = { gte: startOfMonth, lte: endOfMonth };

    const events: CalendarEvent[] = [];

    /* ── Assessments ──────────────────────────────────────────────── */
    try {
      const assessments = await db.assessment.findMany({
        where: {
          date: dateRange,
          classGroup: { schoolId },
        },
        select: {
          id: true,
          title: true,
          date: true,
          type: true,
          maxScore: true,
          weight: true,
          classGroup: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });

      for (const a of assessments) {
        events.push({
          date: toDayKey(a.date),
          type: 'assessment',
          id: a.id,
          title: a.title,
          meta: {
            assessmentType: a.type,
            classGroup: a.classGroup?.name ?? null,
            subject: a.subject?.name ?? null,
            maxScore: a.maxScore ?? null,
            weight: a.weight,
          },
        });
      }
    } catch (err) {
      console.error('Calendar: assessments query failed:', err);
    }

    /* ── Attendance Sessions ──────────────────────────────────────── */
    try {
      const sessions = await db.attendanceSession.findMany({
        where: {
          date: dateRange,
          classGroup: { schoolId },
        },
        select: {
          id: true,
          date: true,
          status: true,
          period: true,
          classGroup: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          records: {
            select: { status: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      for (const s of sessions) {
        const counts: Record<string, number> = {
          PRESENT: 0,
          ABSENT: 0,
          EXCUSED: 0,
          LATE: 0,
        };
        for (const r of s.records) {
          counts[r.status] = (counts[r.status] ?? 0) + 1;
        }
        const total = s.records.length;
        const present = counts.PRESENT ?? 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : null;

        events.push({
          date: toDayKey(s.date),
          type: 'attendance',
          id: s.id,
          title: `${s.classGroup?.name ?? ''} ${t_attendance(s)}`.trim(),
          meta: {
            classGroup: s.classGroup?.name ?? null,
            subject: s.subject?.name ?? null,
            period: s.period ?? null,
            sessionStatus: s.status,
            counts,
            total,
            present,
            rate,
          },
        });
      }
    } catch (err) {
      console.error('Calendar: attendance query failed:', err);
    }

    /* ── Learning Progress Entries (aggregated by day) ───────────── */
    try {
      const progressEntries = await db.learningProgressEntry.findMany({
        where: {
          createdAt: dateRange,
          classGroup: { schoolId },
        },
        select: {
          id: true,
          createdAt: true,
          masteryLevelValue: true,
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Aggregate by day + class group for nicer chips
      const progressByDay = new Map<string, { count: number; classGroups: Set<string> }>();
      for (const e of progressEntries) {
        const key = toDayKey(e.createdAt);
        if (!key) continue;
        const slot = progressByDay.get(key) ?? { count: 0, classGroups: new Set<string>() };
        slot.count += 1;
        if (e.classGroup?.name) slot.classGroups.add(e.classGroup.name);
        progressByDay.set(key, slot);
      }

      for (const [key, slot] of progressByDay.entries()) {
        events.push({
          date: key,
          type: 'progress',
          id: `progress-${key}`,
          title: `${slot.count} ${slot.count === 1 ? 'Eintrag' : 'Einträge'}`,
          meta: {
            count: slot.count,
            classGroups: Array.from(slot.classGroups),
          },
        });
      }
    } catch (err) {
      console.error('Calendar: progress query failed:', err);
    }

    /* ── Reports ──────────────────────────────────────────────────── */
    try {
      const reports = await db.report.findMany({
        where: {
          generatedAt: dateRange,
          classGroup: { schoolId },
        },
        select: {
          id: true,
          generatedAt: true,
          period: true,
          status: true,
          includesGrades: true,
          student: { select: { id: true, firstName: true, lastName: true } },
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { generatedAt: 'asc' },
      });

      for (const r of reports) {
        const studentName = r.student
          ? `${r.student.firstName} ${r.student.lastName}`
          : '—';
        events.push({
          date: toDayKey(r.generatedAt),
          type: 'report',
          id: r.id,
          title: `${studentName} · ${r.period}`,
          meta: {
            studentName,
            classGroup: r.classGroup?.name ?? null,
            period: r.period,
            status: r.status,
            includesGrades: r.includesGrades,
          },
        });
      }
    } catch (err) {
      console.error('Calendar: reports query failed:', err);
    }

    /* ── Lessons (LessonPlan) — try/catch, model may not exist yet ─ */
    try {
      // The LessonPlan model is added by another agent concurrently.
      // Use runtime access so this route still compiles & runs even if the
      // Prisma Client hasn't been regenerated yet.
      const lessonPlanClient = (db as unknown as {
        lessonPlan?: {
          findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
        };
      }).lessonPlan;

      if (lessonPlanClient && typeof lessonPlanClient.findMany === 'function') {
        const lessons = await lessonPlanClient.findMany({
          where: {
            date: dateRange,
            classGroup: { schoolId },
          },
          select: {
            id: true,
            title: true,
            date: true,
            status: true,
            classGroup: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: { date: 'asc' },
        });

        for (const l of lessons) {
          const dateVal = l.date as Date | string;
          const classGroupName =
            (l.classGroup as { name?: string } | null | undefined)?.name ?? null;
          const subjectName =
            (l.subject as { name?: string } | null | undefined)?.name ?? null;
          events.push({
            date: toDayKey(dateVal),
            type: 'lesson',
            id: String(l.id),
            title: String(l.title ?? 'Unterricht'),
            meta: {
              classGroup: classGroupName,
              subject: subjectName,
              status: l.status ?? null,
            },
          });
        }
      }
    } catch (err) {
      // LessonPlan model doesn't exist yet — gracefully return empty.
      console.info('Calendar: LessonPlan not available yet, skipping lessons.');
    }

    /* ── Custom Calendar Events ───────────────────────────────────── */
    try {
      const customEvents = await db.calendarEvent.findMany({
        where: {
          schoolId,
          date: dateRange,
        },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          eventType: true,
          allDay: true,
          notes: true,
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });

      for (const ce of customEvents) {
        // Map custom event types to CalendarEventType
        const mappedType: EventType = ['assessment', 'lesson'].includes(ce.eventType)
          ? (ce.eventType as EventType)
          : 'lesson';
        events.push({
          date: toDayKey(ce.date),
          type: mappedType,
          id: ce.id,
          title: ce.title,
          meta: {
            customEvent: true,
            eventType: ce.eventType,
            startTime: ce.startTime ?? null,
            endTime: ce.endTime ?? null,
            allDay: ce.allDay,
            notes: ce.notes ?? null,
            subject: ce.subject?.name ?? null,
            classGroup: ce.classGroup?.name ?? null,
          },
        });
      }
    } catch (err) {
      console.error('Calendar: custom events query failed:', err);
    }

    // Stable ordering: by date asc, then by type for deterministic display
    const typeOrder: Record<EventType, number> = {
      lesson: 0,
      assessment: 1,
      attendance: 2,
      progress: 3,
      report: 4,
    };
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return NextResponse.json({ events, month: `${year}-${String(monthIndex + 1).padStart(2, '0')}` });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Tiny helper so we don't import i18n on the server. */
function t_attendance(s: { period?: string | null; subject?: { name?: string } | null }): string {
  const parts: string[] = [];
  if (s.subject?.name) parts.push(s.subject.name);
  if (s.period) parts.push(s.period);
  return parts.length ? `· ${parts.join(' ')}` : 'Anwesenheit';
}
