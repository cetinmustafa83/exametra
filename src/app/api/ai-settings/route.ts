import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get AI settings for the school ──
async function getAISettings(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    let settings = await db.aISettings.findUnique({
      where: { schoolId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await db.aISettings.create({
        data: { schoolId },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('AISettings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update AI settings ──
async function updateAISettings(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const schoolId = body.schoolId || session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Remove fields that shouldn't be directly set
    const { id, schoolId: _sid, createdAt, updatedAt, ...updateData } = body;

    let settings = await db.aISettings.findUnique({ where: { schoolId } });

    if (!settings) {
      settings = await db.aISettings.create({
        data: { schoolId, ...updateData },
      });
    } else {
      settings = await db.aISettings.update({
        where: { schoolId },
        data: updateData,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('AISettings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getAISettings, 'dataRead');
export const PUT = withRateLimit(updateAISettings, 'dataWrite');
