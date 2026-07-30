import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    // Verify session exists
    const assessmentSession = await db.peerAssessmentSession.findFirst({
      where: { id, deletedAt: null },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        classGroup: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== assessmentSession.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all submitted assessments for this session
    const assessments = await db.peerAssessment.findMany({
      where: { sessionId: id, status: 'submitted', deletedAt: null },
      include: {
        assessor: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessed: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Parse criteria from session
    const sessionCriteria = assessmentSession.criteria
      ? JSON.parse(assessmentSession.criteria)
      : [];

    // Aggregate results by assessed student
    const byStudent: Record<string, {
      student: { id: string; firstName: string; lastName: string };
      ratings: number[];
      criteriaScores: Record<string, { total: number; count: number; scores: number[] }>;
      comments: string[];
      averageRating: number;
      assessmentCount: number;
    }> = {};

    for (const a of assessments) {
      const sid = a.assessedId;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          student: a.assessed,
          ratings: [],
          criteriaScores: {},
          comments: [],
          averageRating: 0,
          assessmentCount: 0,
        };
        // Initialize criteria scores
        for (const c of sessionCriteria) {
          byStudent[sid].criteriaScores[c.name] = { total: 0, count: 0, scores: [] };
        }
      }

      if (a.level) {
        byStudent[sid].ratings.push(a.level);
      }

      // Parse individual criteria scores
      if (a.criteria) {
        try {
          const critScores = JSON.parse(a.criteria);
          for (const cs of critScores) {
            if (byStudent[sid].criteriaScores[cs.name]) {
              byStudent[sid].criteriaScores[cs.name].total += cs.score;
              byStudent[sid].criteriaScores[cs.name].count += 1;
              byStudent[sid].criteriaScores[cs.name].scores.push(cs.score);
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      if (a.comment) {
        byStudent[sid].comments.push(a.comment);
      }

      byStudent[sid].assessmentCount += 1;
    }

    // Calculate averages
    const studentResults = Object.values(byStudent).map((s) => ({
      ...s,
      averageRating: s.ratings.length > 0
        ? Math.round((s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) * 100) / 100
        : 0,
      criteriaScores: Object.fromEntries(
        Object.entries(s.criteriaScores).map(([name, data]) => [
          name,
          {
            ...data,
            average: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
          },
        ])
      ),
    }));

    // Overall stats
    const allRatings = assessments.filter((a) => a.level).map((a) => a.level as number);
    const overallAverage = allRatings.length > 0
      ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 100) / 100
      : 0;

    // Outlier detection: ratings more than 2 standard deviations from mean
    const ratingStdDev = allRatings.length > 1
      ? Math.sqrt(
          allRatings.reduce((sum, r) => sum + Math.pow(r - overallAverage, 2), 0) /
            allRatings.length
        )
      : 0;

    const outliers = assessments.filter((a) => {
      if (!a.level) return false;
      return Math.abs(a.level - overallAverage) > 2 * ratingStdDev;
    });

    // Competency averages for radar chart
    const competencyAverages: Record<string, number> = {};
    for (const c of sessionCriteria) {
      const scores = studentResults
        .map((s) => s.criteriaScores[c.name]?.average || 0)
        .filter((v) => v > 0);
      competencyAverages[c.name] = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;
    }

    return NextResponse.json({
      session: assessmentSession,
      studentResults,
      overallStats: {
        totalAssessments: assessments.length,
        overallAverage,
        ratingStdDev: Math.round(ratingStdDev * 100) / 100,
        uniqueAssessors: new Set(assessments.map((a) => a.assessorId)).size,
        uniqueAssessed: new Set(assessments.map((a) => a.assessedId)).size,
      },
      competencyAverages,
      outliers: outliers.map((o) => ({
        id: o.id,
        assessor: assessmentSession.anonymityMode === 'anonymous' && o.isAnonymous
          ? { id: 'hidden', firstName: 'Anonym', lastName: '' }
          : o.assessor,
        assessed: o.assessed,
        level: o.level,
        comment: o.comment,
      })),
    });
  } catch (error) {
    console.error('PeerAssessmentSession results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
