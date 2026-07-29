import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admin/teacher can generate topics
    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers and admins can generate topics' },
        { status: 403 }
      );
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    // Check AI settings
    const aiSettings = await db.aISettings.findUnique({
      where: { schoolId },
    });

    if (!aiSettings || !aiSettings.aiTopicGenEnabled) {
      return NextResponse.json(
        { error: 'Topic generation is disabled for your school' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { categoryName, subjectName, gradeLevel, additionalContext } = body;

    if (!categoryName || !subjectName) {
      return NextResponse.json(
        { error: 'Category name and subject name are required' },
        { status: 400 }
      );
    }

    // Build prompt for topic generation
    const prompt = `Generiere eine Liste von Lernthemen fuer die Kategorie "${categoryName}" im Fach ${subjectName}${gradeLevel ? ` fuer die Jahrgangsstufe ${gradeLevel}` : ''}.${additionalContext ? ` Zusaetzlicher Kontext: ${additionalContext}` : ''} 

Bitte gib die Themen als JSON-Array zurueck, wobei jedes Thema folgende Felder hat:
- "name": Der Name des Themas (kurz und praegnant)
- "description": Eine kurze Beschreibung des Themas (1-2 Saetze)
- "difficulty": Die Schwierigkeit (1-5, wobei 1 am einfachsten ist)
- "keywords": Ein Array von 3-5 Schluesselwoertern

Generiere 5-10 passende Themen. Antworte NUR mit dem JSON-Array, ohne Markdown-Formatierung.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein Lehrplan-Experte. Du generierst strukturierte Lernthemen fuer den Schulunterricht. Du antwortest ausschliesslich mit validem JSON.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const aiResponse = completion.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let topics;
    try {
      // Try to extract JSON from the response (might be wrapped in code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        topics = JSON.parse(aiResponse);
      }
    } catch {
      // If parsing fails, return the raw response
      return NextResponse.json({
        topics: [],
        rawResponse: aiResponse,
        error: 'Failed to parse AI response as JSON',
      });
    }

    return NextResponse.json({
      topics,
      categoryName,
      subjectName,
    });
  } catch (error) {
    console.error('AI Topic Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
