import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const saveAnnotationSchema = z.object({
  assessmentId: z.string().min(1),
  studentId: z.string().min(1),
  annotationData: z.string().min(1),
  annotationImage: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessmentId');
    const studentId = searchParams.get('studentId');

    if (!assessmentId || !studentId) {
      return NextResponse.json({ error: 'assessmentId and studentId are required' }, { status: 400 });
    }

    const result = await db.assessmentResult.findUnique({
      where: {
        assessmentId_studentId: { assessmentId, studentId },
      },
      select: {
        id: true,
        annotationData: true,
        annotationImage: true,
        note: true,
        score: true,
      },
    });

    if (!result) {
      return NextResponse.json({ annotation: null });
    }

    return NextResponse.json({
      annotation: result.annotationData ? {
        id: result.id,
        annotationData: result.annotationData,
        annotationImage: result.annotationImage,
      } : null,
    });
  } catch (error) {
    console.error('Grading Annotate GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'TEACHER' && role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = saveAnnotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { assessmentId, studentId, annotationData, annotationImage } = parsed.data;

    // Upsert the annotation into the assessment result
    const existing = await db.assessmentResult.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } },
    });

    if (existing) {
      const updated = await db.assessmentResult.update({
        where: { id: existing.id },
        data: {
          annotationData,
          annotationImage: annotationImage ?? existing.annotationImage,
        },
      });
      return NextResponse.json({ annotation: { id: updated.id, annotationData: updated.annotationData, annotationImage: updated.annotationImage } });
    } else {
      // Create a new result with just the annotation
      const created = await db.assessmentResult.create({
        data: {
          assessmentId,
          studentId,
          annotationData,
          annotationImage: annotationImage ?? null,
        },
      });
      return NextResponse.json({ annotation: { id: created.id, annotationData: created.annotationData, annotationImage: created.annotationImage } }, { status: 201 });
    }
  } catch (error) {
    console.error('Grading Annotate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
