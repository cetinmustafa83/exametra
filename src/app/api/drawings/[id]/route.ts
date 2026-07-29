import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateDrawingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  drawingData: z.string().optional(),
  imageData: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  classGroupId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const drawing = await db.drawing.findUnique({
      where: { id },
    });

    if (!drawing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }

    // Only owner or public drawings
    if (drawing.ownerId !== session.userId && !drawing.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(drawing);
  } catch (error) {
    console.error('Drawing GET by ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await db.drawing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }
    if (existing.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateDrawingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const drawing = await db.drawing.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(drawing);
  } catch (error) {
    console.error('Drawing PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await db.drawing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }
    if (existing.ownerId !== session.userId && session.user?.role !== 'SUPER_ADMIN' && session.user?.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.drawing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drawing DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
