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
    const userId = session.userId;

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (role === 'TEACHER') {
      // Teachers see tests for their classes
      const teacherClasses = await db.classGroupTeacher.findMany({
        where: { userId },
        select: { classGroupId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classGroupId);
      if (classIds.length > 0) {
        where.OR = [
          { classGroupId: { in: classIds } },
          { studentId: null },
        ];
      }
    }
    // ADMIN, VICE_PRINCIPAL, SUPER_ADMIN see all

    const tests = await db.aITestGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        assessment: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('AITests GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      topic,
      testType,
      difficulty,
      questionCount,
      gradeLevel,
      subjectId,
      classGroupId,
      assessmentId,
      studentId,
    } = body;

    if (!schoolId || !topic) {
      return NextResponse.json({ error: 'schoolId and topic are required' }, { status: 400 });
    }

    const count = questionCount || 10;
    const diff = difficulty || 'medium';
    const type = testType || 'practice';
    const grade = gradeLevel || '8';

    // Generate questions using AI
    const systemPrompt = `Du bist ein Lehrer. Erstelle eine Übungsklausur zum Thema ${topic} für die Klasse ${grade}. Erstelle ${count} Fragen mit Schwierigkeitsgrad ${diff}. Gib die Fragen im JSON-Format zurück: [{question, options, correctAnswer, explanation}]`;

    let questions: string | null = null;
    try {
      const ai = await ZAI.create();
      const response = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Erstelle ${count} Fragen zum Thema "${topic}" im Schwierigkeitsgrad "${diff}" als JSON-Array.` },
        ],
      });

      const content = response?.choices?.[0]?.message?.content || '';
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = jsonMatch[0];
        // Validate it's valid JSON
        JSON.parse(questions);
      } else {
        questions = JSON.stringify([]);
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Fallback: create placeholder questions
      questions = JSON.stringify(
        Array.from({ length: count }, (_, i) => ({
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
        assessmentId: assessmentId || null,
        studentId: studentId || (session.user?.role === 'STUDENT' ? session.userId : null),
        classGroupId: classGroupId || null,
        subjectId: subjectId || null,
        testType: type,
        difficulty: diff,
        questionCount: count,
        questions,
        aiProvider: 'pollination',
        generatedAt: new Date(),
        isCompleted: false,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('AITests POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
