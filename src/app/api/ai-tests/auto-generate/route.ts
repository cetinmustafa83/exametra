// @ts-nocheck
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
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Find assessments with dates in approximately 2 weeks
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    const twoWeeksRange = new Date();
    twoWeeksRange.setDate(twoWeeksRange.getDate() + 16);

    const upcomingAssessments = await db.assessment.findMany({
      where: {
        schoolId,
        date: {
          gte: twoWeeksFromNow,
          lte: twoWeeksRange,
        },
      },
      include: {
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (upcomingAssessments.length === 0) {
      return NextResponse.json({ message: 'No upcoming assessments found', generated: 0 });
    }

    const generatedTests = [];

    for (const assessment of upcomingAssessments) {
      // Check if a test already exists for this assessment
      const existingTest = await db.aITestGeneration.findFirst({
        where: { assessmentId: assessment.id },
      });
      if (existingTest) continue;

      const topic = assessment.title || assessment.subject?.name || 'General';
      const gradeLevel = assessment.classGroup?.name?.replace(/[^0-9]/g, '') || '8';

      // Generate questions using AI
      const systemPrompt = `Du bist ein Lehrer. Erstelle eine Übungsklausur zum Thema ${topic} für die Klasse ${gradeLevel}. Erstelle 10 Fragen mit Schwierigkeitsgrad medium. Gib die Fragen im JSON-Format zurück: [{question, options, correctAnswer, explanation}]`;

      let questions: string;
      try {
        const ai = await ZAI.create();
        const response = await ai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Erstelle 10 Fragen zum Thema "${topic}" im Schwierigkeitsgrad "medium" als JSON-Array.` },
          ],
        });

        const content = response?.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = jsonMatch[0];
          JSON.parse(questions);
        } else {
          questions = JSON.stringify([]);
        }
      } catch (aiError) {
        console.error('AI generation error for assessment', assessment.id, aiError);
        questions = JSON.stringify(
          Array.from({ length: 10 }, (_, i) => ({
            question: `${topic} - Frage ${i + 1}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            explanation: `Erklaerung zu Frage ${i + 1}`,
          }))
        );
      }

      const test = await db.aITestGeneration.create({
        data: {
          schoolId,
          assessmentId: assessment.id,
          classGroupId: assessment.classGroupId,
          subjectId: assessment.subjectId,
          testType: 'practice',
          difficulty: 'medium',
          questionCount: 10,
          questions,
          aiProvider: 'pollination',
          generatedAt: new Date(),
          isCompleted: false,
        },
      });

      generatedTests.push(test);
    }

    return NextResponse.json({
      message: `Generated ${generatedTests.length} practice tests`,
      generated: generatedTests.length,
      tests: generatedTests,
    });
  } catch (error) {
    console.error('AITests auto-generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
