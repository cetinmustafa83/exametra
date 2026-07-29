import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: get ISO week key (YYYY-Www) for a date (Monday-based, ISO-8601)
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // make Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function startOfDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classGroupId = searchParams.get('classGroupId');
    const subjectId = searchParams.get('subjectId');
    const schoolYearId = searchParams.get('schoolYearId');
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build base where clause for LearningProgressEntry
    const where: Record<string, unknown> = {};

    if (classGroupId) {
      where.classGroupId = classGroupId;
    } else {
      // Scope by school via classGroup relation
      const classWhere: Record<string, unknown> = {};
      if (schoolId) classWhere.schoolId = schoolId;
      if (schoolYearId) classWhere.schoolYearId = schoolYearId;
      where.classGroup = classWhere;
    }

    // Subject filter — via competency.category.competencyTemplate.subjectId
    if (subjectId) {
      where.competency = {
        category: {
          competencyTemplate: { subjectId },
        },
      };
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    // ── Fetch all matching entries with light relations ──
    const entries = await db.learningProgressEntry.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        masteryLevelValue: true,
        studentId: true,
        competencyId: true,
        classGroupId: true,
        competency: {
          select: {
            id: true,
            code: true,
            title: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        classGroup: { select: { id: true, name: true, schoolId: true, schoolYearId: true } },
      },
    });

    // ── Mastery Trend (weekly aggregation) ──
    const weekMap = new Map<string, { total: number; count: number; dateMs: number }>();
    for (const e of entries) {
      const wk = isoWeekKey(new Date(e.date));
      const cur = weekMap.get(wk) ?? { total: 0, count: 0, dateMs: 0 };
      cur.total += e.masteryLevelValue;
      cur.count += 1;
      const d = new Date(e.date);
      const ms = startOfDate(d).getTime();
      if (cur.dateMs === 0 || ms < cur.dateMs) cur.dateMs = ms;
      weekMap.set(wk, cur);
    }
    const masteryTrend = Array.from(weekMap.entries())
      .map(([week, v]) => ({
        week,
        date: new Date(v.dateMs).toISOString(),
        avgMastery: v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0,
        count: v.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // ── Class Comparison (avg per class for the subject) ──
    const classAgg = new Map<string, { className: string; total: number; count: number; students: Set<string> }>();
    for (const e of entries) {
      const cid = e.classGroupId;
      const className = e.classGroup?.name ?? cid;
      const cur = classAgg.get(cid) ?? { className, total: 0, count: 0, students: new Set<string>() };
      cur.total += e.masteryLevelValue;
      cur.count += 1;
      cur.students.add(e.studentId);
      classAgg.set(cid, cur);
    }
    const classComparison = Array.from(classAgg.entries())
      .map(([classId, v]) => ({
        classId,
        className: v.className,
        avgMastery: v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0,
        studentCount: v.students.size,
      }))
      .sort((a, b) => b.avgMastery - a.avgMastery);

    // ── Mastery Distribution (levels 1-4) ──
    const distMap = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0]]);
    for (const e of entries) {
      const lvl = Math.min(4, Math.max(1, Math.floor(e.masteryLevelValue)));
      distMap.set(lvl, (distMap.get(lvl) ?? 0) + 1);
    }
    const totalEntries = entries.length;
    const masteryDistribution = Array.from(distMap.entries())
      .map(([level, count]) => ({
        level,
        count,
        percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.level - b.level);

    // ── Top/Bottom Competencies ──
    const compAgg = new Map<string, { code: string; title: string; total: number; count: number }>();
    for (const e of entries) {
      const cid = e.competencyId;
      const cur = compAgg.get(cid) ?? {
        code: e.competency?.code ?? cid,
        title: e.competency?.title ?? '',
        total: 0,
        count: 0,
      };
      cur.total += e.masteryLevelValue;
      cur.count += 1;
      compAgg.set(cid, cur);
    }
    const competencyArr = Array.from(compAgg.entries())
      .map(([competencyId, v]) => ({
        competencyId,
        code: v.code,
        title: v.title,
        avgMastery: v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0,
        entryCount: v.count,
      }))
      .sort((a, b) => b.avgMastery - a.avgMastery);

    const topCompetencies = competencyArr.slice(0, 5);
    const bottomCompetencies = competencyArr
      .slice()
      .sort((a, b) => a.avgMastery - b.avgMastery)
      .slice(0, 5);

    // ── Activity Heatmap (last 90 days) ──
    const now = new Date();
    const ninetyAgo = new Date(now);
    ninetyAgo.setDate(ninetyAgo.getDate() - 89);
    const heatStart = startOfDate(ninetyAgo);
    const heatEnd = startOfDate(now);

    const heatMap = new Map<string, number>();
    for (let d = new Date(heatStart); d.getTime() <= heatEnd.getTime(); d.setDate(d.getDate() + 1)) {
      heatMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const e of entries) {
      const ed = startOfDate(new Date(e.date));
      if (ed.getTime() < heatStart.getTime() || ed.getTime() > heatEnd.getTime()) continue;
      const key = ed.toISOString().slice(0, 10);
      heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
    }
    const activityHeatmap = Array.from(heatMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Grade Trend by Week (with class-average line) ──
    // For each ISO week: school avg mastery (entry-weighted), entry count,
    // unique students, class-average (simple mean of per-class averages).
    type TrendWeekAgg = {
      total: number;
      count: number;
      students: Set<string>;
      dateMs: number;
      classAgg: Map<string, { total: number; count: number }>;
    };
    const trendWeekMap = new Map<string, TrendWeekAgg>();
    for (const e of entries) {
      const wk = isoWeekKey(new Date(e.date));
      const cur = trendWeekMap.get(wk) ?? {
        total: 0,
        count: 0,
        students: new Set<string>(),
        dateMs: 0,
        classAgg: new Map<string, { total: number; count: number }>(),
      };
      cur.total += e.masteryLevelValue;
      cur.count += 1;
      cur.students.add(e.studentId);
      const ms = startOfDate(new Date(e.date)).getTime();
      if (cur.dateMs === 0 || ms < cur.dateMs) cur.dateMs = ms;
      const cid = e.classGroupId;
      const ca = cur.classAgg.get(cid) ?? { total: 0, count: 0 };
      ca.total += e.masteryLevelValue;
      ca.count += 1;
      cur.classAgg.set(cid, ca);
      trendWeekMap.set(wk, cur);
    }
    const gradeTrend = Array.from(trendWeekMap.entries())
      .map(([week, v]) => {
        const classMeans: number[] = [];
        for (const ca of v.classAgg.values()) {
          if (ca.count > 0) classMeans.push(ca.total / ca.count);
        }
        const classAvg =
          classMeans.length > 0
            ? Math.round((classMeans.reduce((s, m) => s + m, 0) / classMeans.length) * 100) / 100
            : 0;
        const weekNo = parseInt(week.split('-W')[1] ?? '0', 10);
        return {
          week,
          weekLabel: `KW${weekNo}`,
          avgMastery: v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0,
          entryCount: v.count,
          uniqueStudents: v.students.size,
          classAvg,
        };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    // ── At-Risk Students (Risk Analysis) ──
    // Step 1: identify students in scope (via Enrollment → ClassGroup filter)
    const enrollmentWhere: Record<string, unknown> = { endDate: null };
    const enrClassWhere: Record<string, unknown> = {};
    if (schoolId) enrClassWhere.schoolId = schoolId;
    if (schoolYearId) enrClassWhere.schoolYearId = schoolYearId;
    if (classGroupId) enrClassWhere.id = classGroupId;
    if (Object.keys(enrClassWhere).length > 0) {
      enrollmentWhere.classGroup = enrClassWhere;
    }

    let enrollments: Array<{
      studentId: string;
      classGroupId: string;
      student: { id: string; firstName: string; lastName: string; deletedAt: Date | null } | null;
      classGroup: { id: string; name: string } | null;
    }> = [];
    try {
      enrollments = await db.enrollment.findMany({
        where: enrollmentWhere,
        select: {
          studentId: true,
          classGroupId: true,
          student: { select: { id: true, firstName: true, lastName: true, deletedAt: true } },
          classGroup: { select: { id: true, name: true } },
        },
      });
    } catch {
      enrollments = [];
    }

    // Build studentId -> { name, className } (latest enrollment wins)
    const studentMeta = new Map<string, { studentName: string; className: string }>();
    for (const enr of enrollments) {
      if (!enr.student || enr.student.deletedAt) continue;
      const name = `${enr.student.firstName ?? ''} ${enr.student.lastName ?? ''}`.trim();
      studentMeta.set(enr.studentId, {
        studentName: name || enr.studentId,
        className: enr.classGroup?.name ?? '',
      });
    }

    // Step 2: group entries by studentId (only entries in scope are already filtered)
    const studentEntries = new Map<string, Array<{ date: Date; masteryLevelValue: number }>>();
    for (const e of entries) {
      const arr = studentEntries.get(e.studentId) ?? [];
      arr.push({ date: new Date(e.date), masteryLevelValue: e.masteryLevelValue });
      studentEntries.set(e.studentId, arr);
    }

    // Step 3: batch-fetch attendance records (wrapped in try/catch)
    const attendanceMap = new Map<string, { present: number; total: number }>();
    const studentIds = Array.from(studentMeta.keys());
    if (studentIds.length > 0) {
      try {
        const attendanceRecords = await db.attendanceRecord.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        });
        for (const r of attendanceRecords) {
          const cur = attendanceMap.get(r.studentId) ?? { present: 0, total: 0 };
          cur.total += 1;
          if (r.status === 'PRESENT' || r.status === 'LATE') cur.present += 1;
          attendanceMap.set(r.studentId, cur);
        }
      } catch {
        // Attendance data may not exist — ignore
      }
    }

    // Step 4: compute risk score & signals per student
    const nowMs = Date.now();
    const fourteenDaysMs = 14 * 86400000;
    type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
    type RiskSignal = 'low_mastery' | 'no_recent_progress' | 'low_attendance' | 'declining';
    type AtRiskEntry = {
      studentId: string;
      studentName: string;
      className: string;
      riskScore: number;
      riskLevel: RiskLevel;
      signals: RiskSignal[];
      latestMastery: number;
      latestEntryDate: string;
    };
    const atRiskList: AtRiskEntry[] = [];

    for (const [studentId, meta] of studentMeta) {
      const eArr = studentEntries.get(studentId) ?? [];
      const signals: RiskSignal[] = [];
      let riskScore = 0;
      let avgMastery = 0;
      let latestMastery = 0;
      let latestEntryDate: string | null = null;

      if (eArr.length > 0) {
        const sorted = eArr.sort((a, b) => a.date.getTime() - b.date.getTime());
        avgMastery = sorted.reduce((s, e) => s + e.masteryLevelValue, 0) / sorted.length;
        latestMastery = sorted[sorted.length - 1].masteryLevelValue;
        latestEntryDate = sorted[sorted.length - 1].date.toISOString().slice(0, 10);

        if (avgMastery < 2.0) {
          signals.push('low_mastery');
          riskScore += 30;
          if (avgMastery < 1.5) {
            riskScore += 20;
          }
        }

        const latestMs = sorted[sorted.length - 1].date.getTime();
        if (nowMs - latestMs > fourteenDaysMs) {
          signals.push('no_recent_progress');
          riskScore += 20;
        }

        // Declining trend: compare last 4 entries to previous 4
        if (sorted.length >= 8) {
          const prev4 = sorted.slice(-8, -4);
          const last4 = sorted.slice(-4);
          const prevAvg = prev4.reduce((s, e) => s + e.masteryLevelValue, 0) / 4;
          const lastAvg = last4.reduce((s, e) => s + e.masteryLevelValue, 0) / 4;
          if (lastAvg < prevAvg) {
            signals.push('declining');
            riskScore += 15;
          }
        }
      } else {
        // No progress entries at all → counts as no recent progress
        signals.push('no_recent_progress');
        riskScore += 20;
      }

      // Attendance (data may be missing for some students)
      const att = attendanceMap.get(studentId);
      if (att && att.total > 0) {
        const rate = (att.present / att.total) * 100;
        if (rate < 80) {
          signals.push('low_attendance');
          riskScore += 15;
        }
      }

      if (riskScore === 0) continue;

      let riskLevel: RiskLevel;
      if (riskScore >= 65) riskLevel = 'critical';
      else if (riskScore >= 45) riskLevel = 'high';
      else if (riskScore >= 25) riskLevel = 'medium';
      else riskLevel = 'low';

      atRiskList.push({
        studentId,
        studentName: meta.studentName,
        className: meta.className,
        riskScore: Math.min(100, riskScore),
        riskLevel,
        signals,
        latestMastery: Math.round(latestMastery * 100) / 100,
        latestEntryDate: latestEntryDate ?? new Date().toISOString().slice(0, 10),
      });
    }

    atRiskList.sort((a, b) => b.riskScore - a.riskScore);
    const atRiskStudents = atRiskList.slice(0, 10);

    // ── Summary stats ──
    const totalStudents = new Set(entries.map((e) => e.studentId)).size;
    const overallAvgMastery =
      totalEntries > 0
        ? Math.round(
            (entries.reduce((sum, e) => sum + e.masteryLevelValue, 0) / totalEntries) * 100
          ) / 100
        : 0;

    return NextResponse.json({
      masteryTrend,
      classComparison,
      masteryDistribution,
      topCompetencies,
      bottomCompetencies,
      activityHeatmap,
      gradeTrend,
      atRiskStudents,
      totalEntries,
      totalStudents,
      overallAvgMastery,
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
