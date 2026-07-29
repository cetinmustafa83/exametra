import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createDrawingSchema = z.object({
  title: z.string().min(1).default('Untitled Drawing'),
  description: z.string().optional(),
  drawingData: z.string().min(1),
  imageData: z.string().optional(),
  schoolId: z.string().optional(),
  subjectId: z.string().optional(),
  classGroupId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const subjectId = searchParams.get('subjectId');

    const where: Record<string, unknown> = {};
    if (schoolId) {
      where.schoolId = schoolId;
    }
    if (subjectId) {
      where.subjectId = subjectId;
    }

    // Show own drawings + public drawings from the same school
    const drawings = await db.drawing.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { isPublic: true, ...(schoolId ? { schoolId } : {}) },
        ],
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(drawings);
  } catch (error) {
    console.error('Drawings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDrawingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const drawing = await db.drawing.create({
      data: {
        schoolId: parsed.data.schoolId ?? session.user?.schoolId ?? 'default',
        ownerId: session.userId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        drawingData: parsed.data.drawingData,
        imageData: parsed.data.imageData ?? null,
        subjectId: parsed.data.subjectId ?? null,
        classGroupId: parsed.data.classGroupId ?? null,
        isPublic: parsed.data.isPublic,
      },
    });

    return NextResponse.json(drawing, { status: 201 });
  } catch (error) {
    console.error('Drawings POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
