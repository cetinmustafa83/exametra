// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId;
    const status = searchParams.get('status');

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    if (role === 'TEACHER') {
      where.teacherId = session.userId;
    }

    const reviews = await db.teacherGradingReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('GradingReviews GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, assessmentId, teacherId } = body;

    if (!schoolId || !assessmentId || !teacherId) {
      return NextResponse.json({ error: 'schoolId, assessmentId, and teacherId are required' }, { status: 400 });
    }

    // Get assessment results for the teacher
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentResults: {
          where: { teacherId },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Generate AI review
    const systemPrompt = 'Du bist ein erfahrener Lehrer. Überprüfe die Benotung und gib Feedback. Prüfe auf Fairness und Konsistenz.';

    const gradingData = assessment.assessmentResults.map((r: { student: { firstName: string; lastName: string }; score: number | null; masteryLevelValue: number | null }) => ({
      student: `${r.student.firstName} ${r.student.lastName}`,
      score: r.score,
      maxScore: assessment.maxScore,
      grade: r.masteryLevelValue,
    }));

    let reviewResult: string;
    let discrepanciesFound = 0;

    try {
      const ai = await ZAI.create();
      const response = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Überprüfe die folgende Benotung und gib Feedback zu Fairness und Konsistenz:\n\n${JSON.stringify(gradingData, null, 2)}`,
          },
        ],
      });

      reviewResult = response?.choices?.[0]?.message?.content || 'Review could not be generated';
    } catch (aiError) {
      console.error('AI review error:', aiError);
      reviewResult = JSON.stringify({
        overall: 'AI review could not be generated. Manual review recommended.',
        fairness: 'unknown',
        consistency: 'unknown',
        recommendations: ['Please review grading manually'],
      });
    }

    // Count discrepancies
    const scores = assessment.assessmentResults
      .map((r: { score: number | null }) => r.score && assessment.maxScore ? (r.score / assessment.maxScore) * 100 : null)
      .filter((s: number | null): s is number => s !== null);
    if (scores.length > 0) {
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      discrepanciesFound = scores.filter((s: number) => Math.abs(s - avg) > 30).length;
    }

    const review = await db.teacherGradingReview.create({
      data: {
        schoolId,
        assessmentId,
        teacherId,
        aiProvider: 'pollination',
        status: 'completed',
        reviewResult,
        discrepanciesFound,
      },
      include: {
        assessment: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('GradingReviews POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
