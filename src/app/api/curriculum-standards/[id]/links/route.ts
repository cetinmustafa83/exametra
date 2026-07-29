import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

const linkSchema = z.object({
  competencyId: z.string().min(1),
  coverageLevel: z.enum(['full', 'partial', 'related']).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const unlinkSchema = z.object({
  competencyId: z.string().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: standardId } = await params;

    const standard = await db.curriculumStandard.findUnique({
      where: { id: standardId },
    });
    if (!standard || standard.deletedAt) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    const links = await db.curriculumStandardLink.findMany({
      where: { standardId },
      include: {
        competency: {
          select: {
            id: true,
            code: true,
            title: true,
            category: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Curriculum standard links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: standardId } = await params;
    const body = await request.json();

    // Handle both link and unlink actions
    if (body.action === 'unlink') {
      const parsed = unlinkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      await db.curriculumStandardLink.deleteMany({
        where: {
          standardId,
          competencyId: parsed.data.competencyId,
        },
      });

      return NextResponse.json({ success: true, action: 'unlinked' });
    }

    // Link action
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { competencyId, coverageLevel, notes } = parsed.data;

    // Verify standard exists
    const standard = await db.curriculumStandard.findUnique({
      where: { id: standardId },
    });
    if (!standard || standard.deletedAt) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    // Verify competency exists
    const competency = await db.competency.findUnique({
      where: { id: competencyId },
    });
    if (!competency) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }

    // Upsert the link
    const link = await db.curriculumStandardLink.upsert({
      where: {
        standardId_competencyId: { standardId, competencyId },
      },
      create: {
        standardId,
        competencyId,
        coverageLevel: coverageLevel ?? null,
        notes: notes ?? null,
      },
      update: {
        coverageLevel: coverageLevel ?? undefined,
        notes: notes ?? undefined,
      },
      include: {
        competency: {
          select: {
            id: true,
            code: true,
            title: true,
            category: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Curriculum standard links POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
