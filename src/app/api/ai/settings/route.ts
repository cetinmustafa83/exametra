import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    // Only admin/teacher can view AI settings
    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      // Students/parents can only see limited info
      const aiSettings = await db.aISettings.findUnique({
        where: { schoolId },
        select: {
          aiChatEnabled: true,
          aiMaxRequestsPerDay: true,
          aiHelperMode: true,
          virtualCharacterEnabled: true,
        },
      });

      return NextResponse.json(aiSettings || { aiChatEnabled: true, aiMaxRequestsPerDay: 50, aiHelperMode: 'guided', virtualCharacterEnabled: true });
    }

    const aiSettings = await db.aISettings.findUnique({
      where: { schoolId },
    });

    if (!aiSettings) {
      // Return default settings
      return NextResponse.json({
        schoolId,
        pollinationEnabled: true,
        pollinationApiKey: null,
        pollinationModel: 'flux',
        openaiEnabled: false,
        openaiApiKey: null,
        openaiModel: 'gpt-4o',
        anthropicEnabled: false,
        anthropicApiKey: null,
        anthropicModel: 'claude-3-5-sonnet-20241022',
        aiChatEnabled: true,
        aiImageGenEnabled: true,
        aiVideoGenEnabled: false,
        aiAutoTestEnabled: true,
        aiGradingAuditEnabled: false,
        aiTopicGenEnabled: true,
        virtualCharacterEnabled: true,
        aiMaxRequestsPerDay: 50,
        aiHelperMode: 'guided',
        aiSystemPrompt: null,
      });
    }

    return NextResponse.json(aiSettings);
  } catch (error) {
    console.error('AI Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admin can update AI settings
    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update AI settings' },
        { status: 403 }
      );
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    const body = await request.json();

    // Update or create AI settings
    const aiSettings = await db.aISettings.upsert({
      where: { schoolId },
      update: {
        pollinationEnabled: body.pollinationEnabled ?? undefined,
        pollinationApiKey: body.pollinationApiKey ?? undefined,
        pollinationModel: body.pollinationModel ?? undefined,
        openaiEnabled: body.openaiEnabled ?? undefined,
        openaiApiKey: body.openaiApiKey ?? undefined,
        openaiModel: body.openaiModel ?? undefined,
        anthropicEnabled: body.anthropicEnabled ?? undefined,
        anthropicApiKey: body.anthropicApiKey ?? undefined,
        anthropicModel: body.anthropicModel ?? undefined,
        aiChatEnabled: body.aiChatEnabled ?? undefined,
        aiImageGenEnabled: body.aiImageGenEnabled ?? undefined,
        aiVideoGenEnabled: body.aiVideoGenEnabled ?? undefined,
        aiAutoTestEnabled: body.aiAutoTestEnabled ?? undefined,
        aiGradingAuditEnabled: body.aiGradingAuditEnabled ?? undefined,
        aiTopicGenEnabled: body.aiTopicGenEnabled ?? undefined,
        virtualCharacterEnabled: body.virtualCharacterEnabled ?? undefined,
        aiMaxRequestsPerDay: body.aiMaxRequestsPerDay ?? undefined,
        aiHelperMode: body.aiHelperMode ?? undefined,
        aiSystemPrompt: body.aiSystemPrompt ?? undefined,
      },
      create: {
        schoolId,
        pollinationEnabled: body.pollinationEnabled ?? true,
        pollinationApiKey: body.pollinationApiKey ?? null,
        pollinationModel: body.pollinationModel ?? 'flux',
        openaiEnabled: body.openaiEnabled ?? false,
        openaiApiKey: body.openaiApiKey ?? null,
        openaiModel: body.openaiModel ?? 'gpt-4o',
        anthropicEnabled: body.anthropicEnabled ?? false,
        anthropicApiKey: body.anthropicApiKey ?? null,
        anthropicModel: body.anthropicModel ?? 'claude-3-5-sonnet-20241022',
        aiChatEnabled: body.aiChatEnabled ?? true,
        aiImageGenEnabled: body.aiImageGenEnabled ?? true,
        aiVideoGenEnabled: body.aiVideoGenEnabled ?? false,
        aiAutoTestEnabled: body.aiAutoTestEnabled ?? true,
        aiGradingAuditEnabled: body.aiGradingAuditEnabled ?? false,
        aiTopicGenEnabled: body.aiTopicGenEnabled ?? true,
        virtualCharacterEnabled: body.virtualCharacterEnabled ?? true,
        aiMaxRequestsPerDay: body.aiMaxRequestsPerDay ?? 50,
        aiHelperMode: body.aiHelperMode ?? 'guided',
        aiSystemPrompt: body.aiSystemPrompt ?? null,
      },
    });

    return NextResponse.json(aiSettings);
  } catch (error) {
    console.error('AI Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
