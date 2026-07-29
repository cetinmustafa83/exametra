import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createAnnotationSchema = z.object({
  schoolId: z.string().min(1),
  assessmentId: z.string().min(1),
  studentId: z.string().min(1),
  resultId: z.string().optional(),
  type: z.enum(['drawing', 'text', 'highlight', 'stamp']).default('drawing'),
  content: z.string().optional(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().default('#ef4444'),
  strokeWidth: z.number().default(2),
  page: z.number().default(1),
  pathData: z.string().optional(),
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
    const page = searchParams.get('page');

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { assessmentId };
    if (studentId) where.studentId = studentId;
    if (page) where.page = parseInt(page, 10);

    const annotations = await db.gradingAnnotation.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(annotations);
  } catch (error) {
    console.error('GradingAnnotations GET error:', error);
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
    const parsed = createAnnotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const annotation = await db.gradingAnnotation.create({
      data: {
        schoolId: data.schoolId,
        assessmentId: data.assessmentId,
        studentId: data.studentId,
        resultId: data.resultId,
        teacherId: session.userId,
        type: data.type,
        content: data.content,
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
        color: data.color,
        strokeWidth: data.strokeWidth,
        page: data.page,
        pathData: data.pathData,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    console.error('GradingAnnotations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
