import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/wellness/summary — Get wellness summary/stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const period = searchParams.get('period') || 'week'; // week or month

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'schoolId and studentId are required' }, { status: 400 });
    }

    const days = period === 'month' ? 30 : 7;
    const startDate = new Date(Date.now() - days * 86400000);

    const checkins = await db.wellnessCheckin.findMany({
      where: { schoolId, studentId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });

    const scores = await db.wellnessScore.findMany({
      where: { schoolId, studentId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });

    if (checkins.length === 0) {
      return NextResponse.json({
        type: 'summary',
        period,
        checkinCount: 0,
        avgMood: 0,
        avgSleepHours: 0,
        avgSleepQuality: 0,
        avgStressLevel: 0,
        totalActivityMinutes: 0,
        avgMealsCount: 0,
        avgWaterGlasses: 0,
        avgOverallScore: 0,
        avgPhysicalScore: 0,
        avgMentalScore: 0,
        avgSocialScore: 0,
        avgAcademicScore: 0,
        gratitudeEntries: [],
        moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        stressDistribution: {},
        recommendations: [],
      });
    }

    const avgMood = checkins.reduce((s, c) => s + c.mood, 0) / checkins.length;
    const sleepCheckins = checkins.filter(c => c.sleepHours !== null);
    const avgSleepHours = sleepCheckins.length > 0 ? sleepCheckins.reduce((s, c) => s + (c.sleepHours ?? 0), 0) / sleepCheckins.length : 0;
    const sleepQualityCheckins = checkins.filter(c => c.sleepQuality !== null);
    const avgSleepQuality = sleepQualityCheckins.length > 0 ? sleepQualityCheckins.reduce((s, c) => s + (c.sleepQuality ?? 0), 0) / sleepQualityCheckins.length : 0;
    const stressCheckins = checkins.filter(c => c.stressLevel !== null);
    const avgStressLevel = stressCheckins.length > 0 ? stressCheckins.reduce((s, c) => s + (c.stressLevel ?? 0), 0) / stressCheckins.length : 0;
    const activityCheckins = checkins.filter(c => c.activityMinutes !== null);
    const totalActivityMinutes = activityCheckins.reduce((s, c) => s + (c.activityMinutes ?? 0), 0);
    const mealsCheckins = checkins.filter(c => c.mealsCount !== null);
    const avgMealsCount = mealsCheckins.length > 0 ? mealsCheckins.reduce((s, c) => s + (c.mealsCount ?? 0), 0) / mealsCheckins.length : 0;
    const waterCheckins = checkins.filter(c => c.waterGlasses !== null);
    const avgWaterGlasses = waterCheckins.length > 0 ? waterCheckins.reduce((s, c) => s + (c.waterGlasses ?? 0), 0) / waterCheckins.length : 0;

    const avgOverallScore = scores.length > 0 ? scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length : 0;
    const avgPhysicalScore = scores.length > 0 ? scores.filter(s => s.physicalScore !== null).reduce((s, sc) => s + (sc.physicalScore ?? 0), 0) / scores.length : 0;
    const avgMentalScore = scores.length > 0 ? scores.filter(s => s.mentalScore !== null).reduce((s, sc) => s + (sc.mentalScore ?? 0), 0) / scores.length : 0;
    const avgSocialScore = scores.length > 0 ? scores.filter(s => s.socialScore !== null).reduce((s, sc) => s + (sc.socialScore ?? 0), 0) / scores.length : 0;
    const avgAcademicScore = scores.length > 0 ? scores.filter(s => s.academicScore !== null).reduce((s, sc) => s + (sc.academicScore ?? 0), 0) / scores.length : 0;

    // Mood distribution
    const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    checkins.forEach(c => { moodDistribution[c.mood] = (moodDistribution[c.mood] || 0) + 1; });

    // Stress distribution
    const stressDistribution: Record<number, number> = {};
    stressCheckins.forEach(c => {
      const level = c.stressLevel ?? 0;
      stressDistribution[level] = (stressDistribution[level] || 0) + 1;
    });

    // Gratitude entries
    const gratitudeEntries = checkins.filter(c => c.gratitudeEntry).map(c => ({
      date: c.date,
      entry: c.gratitudeEntry,
    }));

    // AI recommendations based on patterns
    const recommendations: string[] = [];
    if (avgSleepHours < 7) {
      recommendations.push('Try to get at least 7-8 hours of sleep per night for better recovery.');
    }
    if (avgStressLevel > 6) {
      recommendations.push('Consider stress-reduction techniques like deep breathing, meditation, or talking to a counselor.');
    }
    if (totalActivityMinutes < 150) {
      recommendations.push('Aim for at least 30 minutes of physical activity most days of the week.');
    }
    if (avgMood < 3) {
      recommendations.push('Your mood has been consistently low. Consider reaching out to a trusted adult or counselor.');
    }
    if (avgWaterGlasses < 6) {
      recommendations.push('Try to drink at least 6-8 glasses of water daily for better hydration.');
    }
    if (avgMealsCount < 3) {
      recommendations.push('Regular meals are important for energy and concentration. Try to eat at least 3 meals per day.');
    }
    if (avgSleepQuality < 3) {
      recommendations.push('Improve sleep quality by reducing screen time before bed and maintaining a consistent sleep schedule.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Great job! Your wellness indicators are looking good. Keep up the healthy habits!');
    }

    return NextResponse.json({
      type: 'summary',
      period,
      checkinCount: checkins.length,
      avgMood: Math.round(avgMood * 10) / 10,
      avgSleepHours: Math.round(avgSleepHours * 10) / 10,
      avgSleepQuality: Math.round(avgSleepQuality * 10) / 10,
      avgStressLevel: Math.round(avgStressLevel * 10) / 10,
      totalActivityMinutes,
      avgMealsCount: Math.round(avgMealsCount * 10) / 10,
      avgWaterGlasses: Math.round(avgWaterGlasses * 10) / 10,
      avgOverallScore: Math.round(avgOverallScore * 10) / 10,
      avgPhysicalScore: Math.round(avgPhysicalScore * 10) / 10,
      avgMentalScore: Math.round(avgMentalScore * 10) / 10,
      avgSocialScore: Math.round(avgSocialScore * 10) / 10,
      avgAcademicScore: Math.round(avgAcademicScore * 10) / 10,
      gratitudeEntries,
      moodDistribution,
      stressDistribution,
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching wellness summary:', error);
    return NextResponse.json({ error: 'Failed to fetch wellness summary' }, { status: 500 });
  }
}
