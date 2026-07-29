import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classGroupId = searchParams.get('classGroupId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Build where clause for sessions
    const where: Record<string, unknown> = {};
    if (classGroupId) {
      where.classGroupId = classGroupId;
    } else {
      // Get all classes for the school
      const classes = await db.classGroup.findMany({
        where: { schoolId },
        select: { id: true },
      });
      where.classGroupId = { in: classes.map((c) => c.id) };
    }

    // Get all attendance sessions with records
    const sessions = await db.attendanceSession.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        records: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return NextResponse.json({
        trendData: [],
        dayOfWeekAnalysis: [],
        absencePatterns: [],
        riskIndicators: [],
        classComparison: [],
        statusDistribution: { present: 0, absent: 0, excused: 0, late: 0 },
        totalSessions: 0,
        totalRecords: 0,
      });
    }

    // ── Trend Data (weekly) ──
    const weekMap = new Map<string, { present: number; absent: number; excused: number; late: number; total: number }>();
    for (const session of sessions) {
      const d = new Date(session.date);
      // Get ISO week
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay() + 1); // Monday
      const weekKey = startOfWeek.toISOString().split('T')[0];

      const existing = weekMap.get(weekKey) || { present: 0, absent: 0, excused: 0, late: 0, total: 0 };
      for (const record of session.records) {
        existing.total++;
        if (record.status === 'PRESENT') existing.present++;
        else if (record.status === 'ABSENT') existing.absent++;
        else if (record.status === 'EXCUSED') existing.excused++;
        else if (record.status === 'LATE') existing.late++;
      }
      weekMap.set(weekKey, existing);
    }

    const trendData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        attendanceRate: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0,
        absentRate: data.total > 0 ? Math.round((data.absent / data.total) * 100) : 0,
        present: data.present,
        absent: data.absent,
        excused: data.excused,
        late: data.late,
        total: data.total,
      }));

    // ── Day-of-Week Analysis ──
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesDe = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayMap = new Map<number, { present: number; absent: number; total: number }>();
    for (let i = 0; i < 7; i++) dayMap.set(i, { present: 0, absent: 0, total: 0 });

    for (const session of sessions) {
      const d = new Date(session.date);
      const dayOfWeek = d.getDay();
      const existing = dayMap.get(dayOfWeek)!;
      for (const record of session.records) {
        existing.total++;
        if (record.status === 'PRESENT' || record.status === 'LATE') existing.present++;
        else if (record.status === 'ABSENT') existing.absent++;
      }
      dayMap.set(dayOfWeek, existing);
    }

    const dayOfWeekAnalysis = Array.from(dayMap.entries())
      .filter(([day]) => day >= 1 && day <= 5) // Monday-Friday only
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({
        day,
        dayName: dayNames[day],
        dayNameDe: dayNamesDe[day],
        attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        absentCount: data.absent,
        totalRecords: data.total,
      }));

    // ── Absence Patterns (chronic absence) ──
    const studentAbsenceMap = new Map<string, { studentId: string; firstName: string; lastName: string; present: number; absent: number; excused: number; late: number; total: number }>();
    for (const session of sessions) {
      for (const record of session.records) {
        const key = record.studentId;
        const existing = studentAbsenceMap.get(key) || {
          studentId: record.studentId,
          firstName: record.student.firstName,
          lastName: record.student.lastName,
          present: 0,
          absent: 0,
          excused: 0,
          late: 0,
          total: 0,
        };
        existing.total++;
        if (record.status === 'PRESENT') existing.present++;
        else if (record.status === 'ABSENT') existing.absent++;
        else if (record.status === 'EXCUSED') existing.excused++;
        else if (record.status === 'LATE') existing.late++;
        studentAbsenceMap.set(key, existing);
      }
    }

    const absencePatterns = Array.from(studentAbsenceMap.values())
      .map((s) => ({
        ...s,
        absenceRate: s.total > 0 ? Math.round((s.absent / s.total) * 100) : 0,
        attendanceRate: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
      }))
      .filter((s) => s.absenceRate >= 10) // Chronic absence threshold
      .sort((a, b) => b.absenceRate - a.absenceRate);

    // ── Risk Indicators ──
    const riskIndicators = Array.from(studentAbsenceMap.values())
      .map((s) => {
        const absenceRate = s.total > 0 ? s.absent / s.total : 0;
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (absenceRate >= 0.25) riskLevel = 'critical';
        else if (absenceRate >= 0.15) riskLevel = 'high';
        else if (absenceRate >= 0.10) riskLevel = 'medium';

        return {
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          absenceRate: Math.round(absenceRate * 100),
          totalAbsences: s.absent,
          totalSessions: s.total,
          riskLevel,
        };
      })
      .filter((s) => s.riskLevel !== 'low')
      .sort((a, b) => b.absenceRate - a.absenceRate);

    // ── Class Comparison ──
    const classMap = new Map<string, { classGroupId: string; className: string; gradeLevel: number; present: number; absent: number; excused: number; late: number; total: number }>();
    for (const session of sessions) {
      const key = session.classGroupId;
      const existing = classMap.get(key) || {
        classGroupId: session.classGroupId,
        className: session.classGroup.name,
        gradeLevel: session.classGroup.gradeLevel,
        present: 0,
        absent: 0,
        excused: 0,
        late: 0,
        total: 0,
      };
      for (const record of session.records) {
        existing.total++;
        if (record.status === 'PRESENT') existing.present++;
        else if (record.status === 'ABSENT') existing.absent++;
        else if (record.status === 'EXCUSED') existing.excused++;
        else if (record.status === 'LATE') existing.late++;
      }
      classMap.set(key, existing);
    }

    const classComparison = Array.from(classMap.values())
      .map((c) => ({
        ...c,
        attendanceRate: c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0,
        absenceRate: c.total > 0 ? Math.round((c.absent / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // ── Overall Status Distribution ──
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let totalLate = 0;
    for (const session of sessions) {
      for (const record of session.records) {
        if (record.status === 'PRESENT') totalPresent++;
        else if (record.status === 'ABSENT') totalAbsent++;
        else if (record.status === 'EXCUSED') totalExcused++;
        else if (record.status === 'LATE') totalLate++;
      }
    }

    return NextResponse.json({
      trendData,
      dayOfWeekAnalysis,
      absencePatterns,
      riskIndicators,
      classComparison,
      statusDistribution: {
        present: totalPresent,
        absent: totalAbsent,
        excused: totalExcused,
        late: totalLate,
      },
      totalSessions: sessions.length,
      totalRecords: totalPresent + totalAbsent + totalExcused + totalLate,
    });
  } catch (error) {
    console.error('Attendance analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
