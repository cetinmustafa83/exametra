import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: Get single AI settings record ──
async function getAISetting(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const settings = await db.aISettings.findUnique({ where: { id } });

    if (!settings) {
      return NextResponse.json({ error: 'AI settings not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('AISettings GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update AI settings by ID ──
async function updateAISetting(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json();
    const { createdAt, updatedAt, ...updateData } = body;

    const settings = await db.aISettings.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('AISettings PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete AI settings ──
async function deleteAISetting(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await db.aISettings.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('AISettings DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getAISetting, 'dataRead');
export const PUT = withRateLimit(updateAISetting, 'dataWrite');
export const DELETE = withRateLimit(deleteAISetting, 'dataWrite');
