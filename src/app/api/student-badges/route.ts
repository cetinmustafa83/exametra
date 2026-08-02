import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

const awardBadgeSchema = z.object({
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  badgeId: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
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
    const studentIdParam = searchParams.get('studentId');
    const badgeIdParam = searchParams.get('badgeId');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) return NextResponse.json([]);

    const where: Record<string, unknown> = { schoolId };
    if (studentIdParam && (!session.user || !(await canAccessStudent(session.user, studentIdParam)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentIdParam) where.studentId = studentIdParam;
    if (badgeIdParam) where.badgeId = badgeIdParam;

    const studentBadges = await db.studentBadge.findMany({
      where,
      orderBy: { awardedAt: 'desc' },
      include: {
        badge: true,
        student: { select: { id: true, firstName: true, lastName: true } },
        awardedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(studentBadges);
  } catch (error) {
    console.error('StudentBadges GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = awardBadgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const { schoolId, studentId, badgeId } = parsed.data;
    if (session.user?.role !== 'SUPER_ADMIN' && schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify badge exists
    const badge = await db.badge.findUnique({ where: { id: badgeId, deletedAt: null } });
    if (!badge) return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    if (badge.schoolId !== schoolId) return NextResponse.json({ error: 'Badge not found in this school' }, { status: 404 });

    // Verify student exists
    const student = await db.student.findUnique({ where: { id: studentId, deletedAt: null } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (student.schoolId !== schoolId) return NextResponse.json({ error: 'Student not found in this school' }, { status: 404 });

    // Check if already awarded
    const existing = await db.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Badge already awarded to this student' }, { status: 409 });
    }

    const studentBadge = await db.studentBadge.create({
      data: {
        schoolId,
        studentId,
        badgeId,
        awardedBy: session.userId,
        notes: parsed.data.notes ?? null,
      },
      include: {
        badge: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(studentBadge, { status: 201 });
  } catch (error) {
    console.error('StudentBadges POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
