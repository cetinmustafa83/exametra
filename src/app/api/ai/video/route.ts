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

    // Only admin/teacher can generate videos
    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers and admins can generate videos' },
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

    if (!aiSettings || !aiSettings.aiVideoGenEnabled) {
      return NextResponse.json(
        { error: 'Video generation is disabled for your school' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, quality = 'standard', size = '1280x720' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate video using z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const task = await zai.video.generations.create({
      prompt,
      quality,
      size,
    });

    return NextResponse.json({
      taskId: task.id || task.taskId || 'pending',
      status: task.status || 'processing',
      message: 'Video generation started. Check status for updates.',
    });
  } catch (error) {
    console.error('AI Video Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
