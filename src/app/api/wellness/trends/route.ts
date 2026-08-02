// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/wellness/trends — Get wellness trends over time
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const days = parseInt(searchParams.get('days') || '30');
    const classGroupId = searchParams.get('classGroupId');
    const includeClassAvg = searchParams.get('includeClassAvg') === 'true';

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const startDate = new Date(Date.now() - days * 86400000);

    if (studentId) {
      // Individual student trends
      const checkins = await db.wellnessCheckin.findMany({
        where: { schoolId, studentId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      });

      const scores = await db.wellnessScore.findMany({
        where: { schoolId, studentId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      });

      // Build daily data points
      const trendData = [];
      for (let i = 0; i < days; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dayStr = dayDate.toISOString().split('T')[0];

        const dayCheckin = checkins.find(c => c.date.toISOString().split('T')[0] === dayStr);
        const dayScore = scores.find(s => s.date.toISOString().split('T')[0] === dayStr);

        trendData.push({
          date: dayStr,
          mood: dayCheckin?.mood ?? null,
          sleepHours: dayCheckin?.sleepHours ?? null,
          sleepQuality: dayCheckin?.sleepQuality ?? null,
          stressLevel: dayCheckin?.stressLevel ?? null,
          activityMinutes: dayCheckin?.activityMinutes ?? null,
          overallScore: dayScore?.overallScore ?? null,
          physicalScore: dayScore?.physicalScore ?? null,
          mentalScore: dayScore?.mentalScore ?? null,
          socialScore: dayScore?.socialScore ?? null,
          academicScore: dayScore?.academicScore ?? null,
        });
      }

      // Class average for comparison (anonymized)
      let classAvgData: Array<{ date: string; avgOverall: number; avgMood: number; avgStress: number }> = [];
      if (includeClassAvg && classGroupId) {
        const enrollments = await db.enrollment.findMany({
          where: { classGroupId, endDate: null },
          select: { studentId: true },
        });
        const classStudentIds = enrollments.map(e => e.studentId).filter(id => id !== studentId);

        if (classStudentIds.length > 0) {
          const classScores = await db.wellnessScore.findMany({
            where: { schoolId, studentId: { in: classStudentIds }, date: { gte: startDate } },
            orderBy: { date: 'asc' },
          });
          const classCheckins = await db.wellnessCheckin.findMany({
            where: { schoolId, studentId: { in: classStudentIds }, date: { gte: startDate } },
            orderBy: { date: 'asc' },
          });

          for (let i = 0; i < days; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + i);
            const dayStr = dayDate.toISOString().split('T')[0];

            const dayScores = classScores.filter(s => s.date.toISOString().split('T')[0] === dayStr);
            const dayCheckins = classCheckins.filter(c => c.date.toISOString().split('T')[0] === dayStr);

            if (dayScores.length > 0 || dayCheckins.length > 0) {
              classAvgData.push({
                date: dayStr,
                avgOverall: dayScores.length > 0 ? Math.round(dayScores.reduce((s, sc) => s + sc.overallScore, 0) / dayScores.length * 10) / 10 : 0,
                avgMood: dayCheckins.length > 0 ? Math.round(dayCheckins.reduce((s, c) => s + c.mood, 0) / dayCheckins.length * 10) / 10 : 0,
                avgStress: dayCheckins.filter(c => c.stressLevel !== null).length > 0 ? Math.round(dayCheckins.filter(c => c.stressLevel !== null).reduce((s, c) => s + (c.stressLevel ?? 0), 0) / dayCheckins.filter(c => c.stressLevel !== null).length * 10) / 10 : 0,
              });
            }
          }
        }
      }

      return NextResponse.json({
        type: 'trends',
        studentId,
        days,
        trendData,
        classAvgData,
      });
    }

    // School-wide trends (for admin)
    const allScores = await db.wellnessScore.findMany({
      where: { schoolId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });

    const schoolTrendData = [];
    for (let i = 0; i < days; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);
      const dayStr = dayDate.toISOString().split('T')[0];

      const dayScores = allScores.filter(s => s.date.toISOString().split('T')[0] === dayStr);

      if (dayScores.length > 0) {
        schoolTrendData.push({
          date: dayStr,
          avgOverall: Math.round(dayScores.reduce((s, sc) => s + sc.overallScore, 0) / dayScores.length * 10) / 10,
          avgPhysical: Math.round(dayScores.filter(s => s.physicalScore !== null).reduce((s, sc) => s + (sc.physicalScore ?? 0), 0) / dayScores.length * 10) / 10,
          avgMental: Math.round(dayScores.filter(s => s.mentalScore !== null).reduce((s, sc) => s + (sc.mentalScore ?? 0), 0) / dayScores.length * 10) / 10,
          avgSocial: Math.round(dayScores.filter(s => s.socialScore !== null).reduce((s, sc) => s + (sc.socialScore ?? 0), 0) / dayScores.length * 10) / 10,
          avgAcademic: Math.round(dayScores.filter(s => s.academicScore !== null).reduce((s, sc) => s + (sc.academicScore ?? 0), 0) / dayScores.length * 10) / 10,
          studentCount: dayScores.length,
        });
      }
    }

    return NextResponse.json({
      type: 'school_trends',
      days,
      trendData: schoolTrendData,
    });
  } catch (error) {
    console.error('Error fetching wellness trends:', error);
    return NextResponse.json({ error: 'Failed to fetch wellness trends' }, { status: 500 });
  }
}
// @ts-nocheck
