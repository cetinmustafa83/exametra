import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

const createStandardSchema = z.object({
  schoolId: z.string().min(1),
  subjectId: z.string().optional().nullable(),
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  gradeLevel: z.int().min(1).max(13).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  isDemo: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const gradeLevel = searchParams.get('gradeLevel');
    const category = searchParams.get('category');
    const source = searchParams.get('source');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
    if (gradeLevel) where.gradeLevel = parseInt(gradeLevel);
    if (category) where.category = category;
    if (source) where.source = source;

    const standards = await db.curriculumStandard.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      include: {
        subject: { select: { id: true, name: true } },
        competencyLinks: {
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
        },
      },
    });

    return NextResponse.json(standards);
  } catch (error) {
    console.error('Curriculum standards GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStandardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, subjectId, ...rest } = parsed.data;

    // Verify school exists
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const standard = await db.curriculumStandard.create({
      data: {
        schoolId,
        subjectId: subjectId ?? null,
        ...rest,
      },
      include: {
        subject: { select: { id: true, name: true } },
        competencyLinks: {
          include: {
            competency: {
              select: { id: true, code: true, title: true },
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'CurriculumStandard',
        entityId: standard.id,
        metadata: JSON.stringify({ code: standard.code, title: standard.title }),
      },
    });

    return NextResponse.json(standard, { status: 201 });
  } catch (error) {
    console.error('Curriculum standards POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
