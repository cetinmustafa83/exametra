import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'TEACHER' && role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, assessmentId, studentId } = body;

    if (!schoolId || !assessmentId || !studentId) {
      return NextResponse.json({ error: 'schoolId, assessmentId, and studentId are required' }, { status: 400 });
    }

    // Get assessment and student data
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentResults: {
          where: { studentId },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Get annotations for this student's submission
    const annotations = await db.gradingAnnotation.findMany({
      where: { assessmentId, studentId },
      orderBy: { createdAt: 'asc' },
    });

    const studentResult = assessment.assessmentResults[0];
    const student = studentResult?.student;

    // Generate AI grading audit
    const systemPrompt = `Du bist ein erfahrener Lehrer und Prüfer an einer deutschen Schule. 
Du überprüfst die Benotung eines Schülers und gibst detailliertes Feedback.
Die deutsche Notenskala: 1 (sehr gut), 2 (gut), 3 (befriedigend), 4 (ausreichend), 5 (mangelhaft), 6 (ungenügend).
Analysiere die Leistung und die gegebene Benotung. Wenn die Benotung nicht angemessen ist, schlage eine Korrektur vor mit Begründung.
Antworte immer auf Deutsch und im JSON-Format.`;

    const gradingInfo = {
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      assessmentTitle: assessment.title,
      assessmentType: assessment.type,
      maxScore: assessment.maxScore,
      score: studentResult?.score ?? null,
      note: studentResult?.note ?? null,
      annotationsCount: annotations.length,
      annotationTypes: annotations.map((a: { type: string; content: string | null }) => ({ type: a.type, content: a.content })),
      teacherAnnotations: annotations.filter((a: { type: string }) => a.type === 'stamp' || a.type === 'text').map((a: { type: string; content: string | null; color: string }) => ({ type: a.type, content: a.content, color: a.color })),
    };

    let reviewResult: string;
    let discrepanciesFound = 0;

    try {
      const ai = await ZAI.create();
      const response = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Überprüfe die Benotung für diesen Schüler und gib Feedback:\n\n${JSON.stringify(gradingInfo, null, 2)}\n\nGib deine Antwort als JSON mit folgenden Feldern:\n- currentGrade: die aktuelle Benotung\n- suggestedGrade: deine vorgeschlagene Note\n- reason: detaillierte Begründung auf Deutsch\n- discrepancies: Liste der gefundenen Unstimmigkeiten\n- overallAssessment: Gesamtbewertung der Benotung`,
          },
        ],
      });

      reviewResult = response?.choices?.[0]?.message?.content || 'Review could not be generated';
    } catch (aiError) {
      console.error('AI grading audit error:', aiError);
      reviewResult = JSON.stringify({
        currentGrade: studentResult?.score ?? 'N/A',
        suggestedGrade: 'N/A',
        reason: 'AI review could not be generated. Manual review recommended.',
        discrepancies: ['AI analysis unavailable — please review manually'],
        overallAssessment: 'AI audit could not be completed due to a technical error. Please review the grading manually.',
      });
    }

    // Count discrepancies
    try {
      const parsed = typeof reviewResult === 'string' ? JSON.parse(reviewResult) : reviewResult;
      discrepanciesFound = Array.isArray(parsed.discrepancies) ? parsed.discrepancies.length : 0;
    } catch {
      discrepanciesFound = 0;
    }

    // Create or update the grading review
    const review = await db.teacherGradingReview.create({
      data: {
        schoolId,
        assessmentId,
        teacherId: session.userId,
        aiProvider: 'pollination',
        status: 'completed',
        reviewResult,
        discrepanciesFound,
      },
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

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('AI Grading Audit POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
