// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// Rate limit: max 10 requests per day per user
const MAX_EXERCISE_GENERATIONS_PER_DAY = 10;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    const body = await request.json();
    const { contentId, topic, gradeLevel, count = 5, difficulty = 'medium' } = body;

    if (!contentId && !topic) {
      return NextResponse.json(
        { error: 'contentId or topic is required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count today's exercise generation requests from chat messages
    const todayRequestCount = await db.chatMessage.count({
      where: {
        userId: session.userId,
        schoolId,
        senderType: 'system',
        metadata: { contains: 'exercise_generation' },
        createdAt: { gte: today },
      },
    });

    if (todayRequestCount >= MAX_EXERCISE_GENERATIONS_PER_DAY) {
      return NextResponse.json(
        {
          error: 'Daily exercise generation limit reached',
          retryAfter: 86400,
          limit: MAX_EXERCISE_GENERATIONS_PER_DAY,
        },
        { status: 429 }
      );
    }

    // Get content item if contentId provided
    let contentItem = null;
    let topicName = topic || '';
    let effectiveGradeLevel = gradeLevel || '5';
    let effectiveDifficulty = difficulty || 'medium';

    if (contentId) {
      contentItem = await db.subjectContent.findUnique({
        where: { id: contentId },
      });

      if (!contentItem) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      topicName = contentItem.title;
      effectiveGradeLevel = gradeLevel || extractGradeLevel(contentItem);
      effectiveDifficulty = difficulty || contentItem.difficulty || 'medium';
    }

    // Build AI prompt
    const countStr = Math.min(Math.max(count, 1), 10);
    const systemPrompt = `Du bist ein Lehrer. Erstelle Uebungsfragen zum Thema ${topicName} fuer die Klasse ${effectiveGradeLevel}. Erstelle ${countStr} Fragen. Format: JSON array of {question, options (4 choices), correctAnswer (0-3), explanation}. Antworte NUR mit dem JSON-Array, kein Markdown, kein Code-Block.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Erstelle ${countStr} ${effectiveDifficulty === 'easy' ? 'einfache' : effectiveDifficulty === 'hard' ? 'schwere' : 'mittelschwere'} Multiple-Choice-Fragen zum Thema "${topicName}" fuer die ${effectiveGradeLevel}. Klasse. Jede Frage hat 4 Antwortmoeglichkeiten. Gib das Ergebnis als JSON-Array zurueck.`,
        },
      ],
    });

    const aiResponse = completion.choices?.[0]?.message?.content || '';

    // Parse the AI response to extract questions
    let questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }> = [];

    try {
      // Try to parse the response directly
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      questions = JSON.parse(jsonStr);

      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean questions
      questions = questions
        .filter(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correctAnswer === 'number' &&
            q.correctAnswer >= 0 &&
            q.correctAnswer <= 3
        )
        .map((q) => ({
          question: String(q.question),
          options: q.options.map(String),
          correctAnswer: Number(q.correctAnswer),
          explanation: String(q.explanation || ''),
        }));
    } catch (parseError) {
      console.error('Failed to parse AI questions:', parseError);
      console.error('AI response was:', aiResponse.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse generated questions', raw: aiResponse.substring(0, 200) },
        { status: 500 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions generated' },
        { status: 500 }
      );
    }

    // Save questions to the content item's content field
    if (contentItem) {
      const existingContent = contentItem.content
        ? (() => {
            try {
              return JSON.parse(contentItem.content);
            } catch {
              return {};
            }
          })()
        : {};

      const updatedContent = {
        ...existingContent,
        questions,
        lastGenerated: new Date().toISOString(),
        gradeLevel: effectiveGradeLevel,
        difficulty: effectiveDifficulty,
      };

      await db.subjectContent.update({
        where: { id: contentItem.id },
        data: {
          content: JSON.stringify(updatedContent),
          questionCount: questions.length,
        },
      });
    }

    // Track rate limit via a system chat message
    await db.chatMessage.create({
      data: {
        schoolId,
        userId: session.userId,
        roomId: null,
        content: `Exercise generation: ${questions.length} questions for "${topicName}"`,
        senderType: 'system',
        metadata: JSON.stringify({
          type: 'exercise_generation',
          contentId: contentItem?.id || null,
          topic: topicName,
          questionCount: questions.length,
        }),
        isRead: true,
      },
    });

    // Award XP to virtual character
    const virtualChar = await db.virtualCharacter.findUnique({
      where: { userId: session.userId },
    });
    if (virtualChar) {
      const xpGain = 10;
      const newXp = virtualChar.xp + xpGain;
      const xpPerLevel = 100;
      const newLevel = Math.floor(newXp / xpPerLevel) + 1;
      await db.virtualCharacter.update({
        where: { id: virtualChar.id },
        data: {
          xp: newXp,
          level: newLevel,
          mood: newLevel > virtualChar.level ? 'celebrating' : 'happy',
        },
      });
    }

    return NextResponse.json({
      questions,
      contentId: contentItem?.id || null,
      topic: topicName,
      gradeLevel: effectiveGradeLevel,
      difficulty: effectiveDifficulty,
      requestsToday: todayRequestCount + 1,
      maxRequests: MAX_EXERCISE_GENERATIONS_PER_DAY,
    });
  } catch (error) {
    console.error('Exercise generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch existing questions for a content item
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      );
    }

    const contentItem = await db.subjectContent.findUnique({
      where: { id: contentId },
    });

    if (!contentItem) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    let questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }> = [];

    if (contentItem.content) {
      try {
        const parsed = JSON.parse(contentItem.content);
        if (Array.isArray(parsed.questions)) {
          questions = parsed.questions;
        } else if (Array.isArray(parsed)) {
          questions = parsed;
        }
      } catch {
        // Content is not valid JSON
      }
    }

    return NextResponse.json({
      questions,
      contentId,
      topic: contentItem.title,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error('Exercise GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractGradeLevel(content: { slug?: string; title?: string }): string {
  const slug = content.slug || '';
  const title = content.title || '';

  // Try to extract from slug (e.g., "klasse-5-mathematik")
  const slugMatch = slug.match(/klasse[_-]?(\d+)/i);
  if (slugMatch) return slugMatch[1];

  // Try to extract from title (e.g., "Mathematik Klasse 5")
  const titleMatch = title.match(/klasse\s*(\d+)/i);
  if (titleMatch) return titleMatch[1];

  return '5';
}
// @ts-nocheck
