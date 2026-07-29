import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

const DEFAULT_SYSTEM_PROMPT =
  'Du bist ein hilfreicher Lernassistent fuer Schueler. Du erklaerst Konzepte und hilfst beim Verstehen, aber du loest keine Hausaufgaben. Du motivierst und ermutigst die Schueler. Antworte auf Deutsch, es sei denn der Schueler fragt auf Englisch.';

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

    // Check AI settings
    const aiSettings = await db.aISettings.findUnique({
      where: { schoolId },
    });

    if (!aiSettings || !aiSettings.aiChatEnabled) {
      return NextResponse.json(
        { error: 'AI chat is disabled for your school' },
        { status: 403 }
      );
    }

    // Check daily rate limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRequestCount = await db.chatMessage.count({
      where: {
        userId: session.userId,
        schoolId,
        senderType: 'user',
        roomId: null, // AI chat messages have null roomId
        createdAt: { gte: today },
      },
    });

    if (todayRequestCount >= aiSettings.aiMaxRequestsPerDay) {
      return NextResponse.json(
        {
          error: 'Daily request limit reached',
          retryAfter: 86400,
          limit: aiSettings.aiMaxRequestsPerDay,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Save user message
    await db.chatMessage.create({
      data: {
        schoolId,
        userId: session.userId,
        roomId: null,
        content: message,
        senderType: 'user',
        isRead: true,
      },
    });

    // Build system prompt
    const systemPrompt = aiSettings.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Add helper mode restrictions
    let modeInstructions = '';
    if (aiSettings.aiHelperMode === 'guided') {
      modeInstructions =
        ' Du gibst gefuehrte Hinweise und Erklaerungen, ohne die komplette Loesung zu verraten. Du hilfst dem Schueler, selbst auf die Loesung zu kommen.';
    } else if (aiSettings.aiHelperMode === 'restricted') {
      modeInstructions =
        ' Du darfst nur kurze Hinweise geben und keine ausfuehrlichen Erklaerungen. Verweise auf Lehrbuecher oder die Lehrkraft.';
    }
    // 'full' mode: no extra restrictions

    const fullSystemPrompt = systemPrompt + modeInstructions;

    // Build messages for AI
    const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: fullSystemPrompt },
    ];

    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: 'user', content: message });

    // Call AI
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: aiMessages,
    });

    const aiResponse =
      completion.choices?.[0]?.message?.content ||
      'Es tut mir leid, ich konnte keine Antwort generieren. Bitte versuche es erneut.';

    // Save AI response
    await db.chatMessage.create({
      data: {
        schoolId,
        userId: session.userId,
        roomId: null,
        content: aiResponse,
        senderType: 'ai',
        isRead: false,
      },
    });

    // Award XP to virtual character if exists
    const virtualChar = await db.virtualCharacter.findUnique({
      where: { userId: session.userId },
    });
    if (virtualChar) {
      const xpGain = 5;
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
      response: aiResponse,
      requestsToday: todayRequestCount + 1,
      maxRequests: aiSettings.aiMaxRequestsPerDay,
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get chat history for this user (AI chat only, roomId is null)
    const messages = await db.chatMessage.findMany({
      where: {
        userId: session.userId,
        schoolId,
        roomId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    // Get today's request count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRequestCount = await db.chatMessage.count({
      where: {
        userId: session.userId,
        schoolId,
        senderType: 'user',
        roomId: null,
        createdAt: { gte: today },
      },
    });

    // Get AI settings for rate limit info
    const aiSettings = await db.aISettings.findUnique({
      where: { schoolId },
    });

    return NextResponse.json({
      messages,
      requestsToday: todayRequestCount,
      maxRequests: aiSettings?.aiMaxRequestsPerDay ?? 50,
      chatEnabled: aiSettings?.aiChatEnabled ?? true,
    });
  } catch (error) {
    console.error('AI Chat GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
