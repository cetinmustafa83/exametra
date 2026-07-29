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

    // Only admin/teacher can generate images
    const role = session.user.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers and admins can generate images' },
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

    if (!aiSettings || !aiSettings.aiImageGenEnabled) {
      return NextResponse.json(
        { error: 'Image generation is disabled for your school' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate image using z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size,
    });

    const imageData = response.data?.[0];

    if (!imageData) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: {
        url: imageData.url || null,
        b64_json: imageData.b64_json || null,
        revised_prompt: imageData.revised_prompt || prompt,
      },
    });
  } catch (error) {
    console.error('AI Image Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
