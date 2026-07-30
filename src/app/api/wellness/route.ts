import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/wellness — Get wellness data for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const role = searchParams.get('role') || 'STUDENT';
    const classGroupId = searchParams.get('classGroupId');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Admin/VP: school-wide overview
    if ((role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') && !studentId) {
      const totalCheckins = await db.wellnessCheckin.count({
        where: { schoolId },
      });
      const totalStudents = await db.student.count({
        where: { schoolId, deletedAt: null },
      });
      const recentCheckins = await db.wellnessCheckin.findMany({
        where: { schoolId, date: { gte: new Date(Date.now() - 7 * 86400000) } },
        orderBy: { date: 'desc' },
        take: 50,
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      });
      const avgScores = await db.wellnessScore.aggregate({
        where: { schoolId, date: { gte: new Date(Date.now() - 30 * 86400000) } },
        _avg: { overallScore: true, physicalScore: true, mentalScore: true, socialScore: true, academicScore: true },
      });
      const lowWellnessCount = await db.wellnessScore.count({
        where: { schoolId, overallScore: { lt: 40 }, date: { gte: new Date(Date.now() - 30 * 86400000) } },
      });

      return NextResponse.json({
        type: 'school_overview',
        totalCheckins,
        totalStudents,
        recentCheckins,
        avgScores: {
          overall: avgScores._avg.overallScore ?? 0,
          physical: avgScores._avg.physicalScore ?? 0,
          mental: avgScores._avg.mentalScore ?? 0,
          social: avgScores._avg.socialScore ?? 0,
          academic: avgScores._avg.academicScore ?? 0,
        },
        lowWellnessAlerts: lowWellnessCount,
      });
    }

    // Teacher: class overview
    if (role === 'TEACHER' && classGroupId && !studentId) {
      const enrollments = await db.enrollment.findMany({
        where: { classGroupId, endDate: null },
        select: { studentId: true },
      });
      const studentIds = enrollments.map(e => e.studentId);

      const checkins = await db.wellnessCheckin.findMany({
        where: { schoolId, studentId: { in: studentIds }, date: { gte: new Date(Date.now() - 30 * 86400000) } },
        orderBy: { date: 'desc' },
        take: limit,
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      });
      const scores = await db.wellnessScore.findMany({
        where: { schoolId, studentId: { in: studentIds }, date: { gte: new Date(Date.now() - 30 * 86400000) } },
        orderBy: { date: 'desc' },
      });

      return NextResponse.json({
        type: 'class_overview',
        checkins,
        scores,
        studentCount: studentIds.length,
      });
    }

    // Student or specific student view
    if (studentId) {
      const checkins = await db.wellnessCheckin.findMany({
        where: { schoolId, studentId },
        orderBy: { date: 'desc' },
        take: limit,
      });
      const scores = await db.wellnessScore.findMany({
        where: { schoolId, studentId },
        orderBy: { date: 'desc' },
        take: limit,
      });
      const latestScore = scores[0] ?? null;

      return NextResponse.json({
        type: 'student',
        checkins,
        scores,
        latestScore,
      });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching wellness data:', error);
    return NextResponse.json({ error: 'Failed to fetch wellness data' }, { status: 500 });
  }
}

// POST /api/wellness — Submit daily check-in
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, studentId, mood, sleepHours, sleepQuality, stressLevel, activityType, activityMinutes, mealsCount, waterGlasses, gratitudeEntry, notes } = body;

    if (!schoolId || !studentId || mood === undefined) {
      return NextResponse.json({ error: 'schoolId, studentId, and mood are required' }, { status: 400 });
    }

    if (mood < 1 || mood > 5) {
      return NextResponse.json({ error: 'Mood must be between 1 and 5' }, { status: 400 });
    }

    // Check for existing check-in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await db.wellnessCheckin.findFirst({
      where: {
        schoolId,
        studentId,
        date: { gte: today, lt: tomorrow },
      },
    });

    let checkin;
    if (existing) {
      checkin = await db.wellnessCheckin.update({
        where: { id: existing.id },
        data: {
          mood,
          sleepHours: sleepHours ?? null,
          sleepQuality: sleepQuality ?? null,
          stressLevel: stressLevel ?? null,
          activityType: activityType ?? null,
          activityMinutes: activityMinutes ?? null,
          mealsCount: mealsCount ?? null,
          waterGlasses: waterGlasses ?? null,
          gratitudeEntry: gratitudeEntry ?? null,
          notes: notes ?? null,
        },
      });
    } else {
      checkin = await db.wellnessCheckin.create({
        data: {
          schoolId,
          studentId,
          date: new Date(),
          mood,
          sleepHours: sleepHours ?? null,
          sleepQuality: sleepQuality ?? null,
          stressLevel: stressLevel ?? null,
          activityType: activityType ?? null,
          activityMinutes: activityMinutes ?? null,
          mealsCount: mealsCount ?? null,
          waterGlasses: waterGlasses ?? null,
          gratitudeEntry: gratitudeEntry ?? null,
          notes: notes ?? null,
        },
      });
    }

    // Calculate wellness score
    const recentCheckins = await db.wellnessCheckin.findMany({
      where: { schoolId, studentId, date: { gte: new Date(Date.now() - 14 * 86400000) } },
      orderBy: { date: 'desc' },
      take: 14,
    });

    if (recentCheckins.length >= 1) {
      const avgMood = recentCheckins.reduce((s, c) => s + c.mood, 0) / recentCheckins.length;
      const sleepCheckins = recentCheckins.filter(c => c.sleepHours !== null);
      const avgSleep = sleepCheckins.length > 0 ? sleepCheckins.reduce((s, c) => s + (c.sleepHours ?? 0), 0) / sleepCheckins.length : 7;
      const stressCheckins = recentCheckins.filter(c => c.stressLevel !== null);
      const avgStress = stressCheckins.length > 0 ? stressCheckins.reduce((s, c) => s + (c.stressLevel ?? 5), 0) / stressCheckins.length : 5;
      const activityCheckins = recentCheckins.filter(c => c.activityMinutes !== null);
      const avgActivity = activityCheckins.length > 0 ? activityCheckins.reduce((s, c) => s + (c.activityMinutes ?? 0), 0) / activityCheckins.length : 0;

      // Physical: based on sleep + activity
      const physicalScore = Math.min(100, Math.max(0,
        ((avgSleep >= 7 && avgSleep <= 9 ? 40 : avgSleep >= 6 ? 25 : 10) +
         (avgActivity >= 30 ? 30 : avgActivity >= 15 ? 20 : 10) +
         (avgMood >= 3 ? 30 : avgMood >= 2 ? 15 : 5))
      ));

      // Mental: based on mood + stress
      const mentalScore = Math.min(100, Math.max(0,
        ((avgMood / 5) * 50) + ((10 - avgStress) / 10) * 50
      ));

      // Social: based on mood (proxy)
      const socialScore = Math.min(100, Math.max(0, (avgMood / 5) * 80 + 10));

      // Academic: based on mood + stress + sleep
      const academicScore = Math.min(100, Math.max(0,
        ((avgMood / 5) * 35) + ((10 - avgStress) / 10) * 30 + ((avgSleep >= 7 ? 1 : avgSleep / 7) * 35)
      ));

      const overallScore = Math.round((physicalScore * 0.25 + mentalScore * 0.3 + socialScore * 0.2 + academicScore * 0.25) * 10) / 10;

      // Upsert wellness score
      const existingScore = await db.wellnessScore.findFirst({
        where: { schoolId, studentId, date: { gte: today, lt: tomorrow } },
      });

      if (existingScore) {
        await db.wellnessScore.update({
          where: { id: existingScore.id },
          data: {
            overallScore,
            physicalScore: Math.round(physicalScore * 10) / 10,
            mentalScore: Math.round(mentalScore * 10) / 10,
            socialScore: Math.round(socialScore * 10) / 10,
            academicScore: Math.round(academicScore * 10) / 10,
          },
        });
      } else {
        await db.wellnessScore.create({
          data: {
            schoolId,
            studentId,
            date: new Date(),
            overallScore,
            physicalScore: Math.round(physicalScore * 10) / 10,
            mentalScore: Math.round(mentalScore * 10) / 10,
            socialScore: Math.round(socialScore * 10) / 10,
            academicScore: Math.round(academicScore * 10) / 10,
          },
        });
      }
    }

    return NextResponse.json({ checkin, success: true });
  } catch (error) {
    console.error('Error saving wellness check-in:', error);
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 });
  }
}
