import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const categoryEnum = z.enum(['competency', 'attendance', 'behavior', 'achievement', 'milestone']);
const reqTypeEnum = z.enum(['mastery_level', 'attendance_rate', 'behavior_count', 'progress_entries', 'custom']);

const createBadgeSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#10b981'),
  category: categoryEnum,
  requirementType: reqTypeEnum,
  requirementValue: z.number().int().min(0).optional().nullable(),
  isAuto: z.boolean().default(true),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const categoryParam = searchParams.get('category');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) return NextResponse.json([]);

    const where: Record<string, unknown> = { schoolId, deletedAt: null };
    if (categoryParam) where.category = categoryParam;

    const badges = await db.badge.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { studentBadges: true } },
      },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Badges GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = createBadgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const { schoolId } = parsed.data;

    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const badge = await db.badge.create({
      data: {
        schoolId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        icon: parsed.data.icon,
        color: parsed.data.color,
        category: parsed.data.category,
        requirementType: parsed.data.requirementType,
        requirementValue: parsed.data.requirementValue ?? null,
        isAuto: parsed.data.isAuto,
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error('Badges POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
