import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ─── Validation ─────────────────────────────────────────────────────

const competitionTypeEnum = z.enum(['class', 'inter_class', 'inter_school']);
const categoryEnum = z.enum([
  'academic', 'sports', 'creativity', 'citizenship',
  'digital', 'reading', 'stem', 'other',
]);
const statusEnum = z.enum(['draft', 'registration', 'active', 'completed', 'cancelled']);
const scoringTypeEnum = z.enum(['points', 'rank', 'time', 'badge_count']);

const createCompetitionSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  competitionType: competitionTypeEnum,
  category: categoryEnum,
  subjectId: z.string().optional().nullable(),
  status: statusEnum.default('draft'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  registrationDeadline: z.string().optional().nullable(),
  maxParticipants: z.number().int().min(1).optional().nullable(),
  scoringType: scoringTypeEnum.default('points'),
  rules: z.string().max(20000).optional().nullable(),
  isPublic: z.boolean().default(false),
  isDemo: z.boolean().default(false),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

// ─── GET /api/competitions — list competitions ──────────────────────

async function getCompetitions(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // All authenticated users can view competitions (students, parents, teachers, admins)

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const statusParam = searchParams.get('status');
    const competitionTypeParam = searchParams.get('competitionType');
    const categoryParam = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let schoolId: string | undefined;
    if (session.user?.role === 'SUPER_ADMIN') {
      // Super admins can query any school or see all
      schoolId = schoolIdParam ?? undefined;
    } else if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      // TEACHER, STUDENT, PARENT — always use the session schoolId to prevent
      // cross-school access which would lead to 403 on sub-resources
      schoolId = session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      // SUPER_ADMIN without a schoolId filter, or users without a schoolId
      if (session.user?.role === 'SUPER_ADMIN') {
        // Super admins can see all competitions
        const where: Record<string, unknown> = { deletedAt: null };
        if (statusParam) where.status = statusParam;
        if (competitionTypeParam) where.competitionType = competitionTypeParam;
        if (categoryParam) where.category = categoryParam;

        const isPublicParam = searchParams.get('isPublic');
        if (isPublicParam === 'true') where.isPublic = true;

        const [competitions, total] = await Promise.all([
          db.competition.findMany({
            where,
            orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
            skip: offset,
            take: limit,
            include: {
              school: { select: { id: true, name: true } },
              createdBy: { select: { id: true, firstName: true, lastName: true } },
              subject: { select: { id: true, name: true } },
              _count: { select: { participants: true, rewards: true } },
            },
          }),
          db.competition.count({ where }),
        ]);

        return NextResponse.json({ competitions, total });
      }

      // Other users without a schoolId can still see public competitions
      const where: Record<string, unknown> = { isPublic: true, deletedAt: null };
      if (statusParam) where.status = statusParam;
      if (competitionTypeParam) where.competitionType = competitionTypeParam;
      if (categoryParam) where.category = categoryParam;

      const [competitions, total] = await Promise.all([
        db.competition.findMany({
          where,
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          skip: offset,
          take: limit,
          include: {
            school: { select: { id: true, name: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            subject: { select: { id: true, name: true } },
            _count: { select: { participants: true, rewards: true } },
          },
        }),
        db.competition.count({ where }),
      ]);

      return NextResponse.json({ competitions, total });
    }

    const where: Record<string, unknown> = { schoolId, deletedAt: null };
    if (statusParam) where.status = statusParam;
    if (competitionTypeParam) where.competitionType = competitionTypeParam;
    if (categoryParam) where.category = categoryParam;

    // For inter-school competitions, also show public ones from other schools
    const isPublicParam = searchParams.get('isPublic');
    if (isPublicParam === 'true') {
      delete where.schoolId;
      where.isPublic = true;
      where.deletedAt = null;
    }

    const [competitions, total] = await Promise.all([
      db.competition.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          school: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          _count: { select: { participants: true, rewards: true } },
        },
      }),
      db.competition.count({ where }),
    ]);

    return NextResponse.json({ competitions, total });
  } catch (error) {
    console.error('Competitions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/competitions — create competition ────────────────────

async function createCompetition(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCompetitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, startDate, endDate, registrationDeadline } = parsed.data;

    // Verify school access
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const competition = await db.competition.create({
      data: {
        schoolId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        competitionType: parsed.data.competitionType,
        category: parsed.data.category,
        subjectId: parsed.data.subjectId ?? null,
        status: parsed.data.status,
        startDate: start,
        endDate: end,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        maxParticipants: parsed.data.maxParticipants ?? null,
        scoringType: parsed.data.scoringType,
        rules: parsed.data.rules ?? null,
        isPublic: parsed.data.isPublic,
        isDemo: parsed.data.isDemo,
        createdById: session.user.id,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { participants: true, rewards: true } },
      },
    });

    return NextResponse.json(competition, { status: 201 });
  } catch (error) {
    console.error('Competitions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getCompetitions, 'dataRead');
export const POST = withRateLimit(createCompetition, 'dataWrite');
