// @ts-nocheck
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ─── Validation ─────────────────────────────────────────────────────

const federationCategoryEnum = z.enum([
  'math_olympiad', 'science_bowl', 'language_quiz', 'general_knowledge',
]);

const scheduleEnum = z.enum(['weekly', 'monthly', 'quarterly']);

const createFederationSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  category: federationCategoryEnum,
  subjectId: z.string().optional().nullable(),
  schedule: scheduleEnum,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  registrationDeadline: z.string().optional().nullable(),
  maxParticipants: z.number().int().min(1).optional().nullable(),
  rules: z.string().max(20000).optional().nullable(),
  isPublic: z.boolean().default(true),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

// ─── GET /api/competitions/federation — list federation competitions ─

async function getFederationCompetitions(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const scheduleParam = searchParams.get('schedule');
    const statusParam = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Find the user's school and its district
    const userSchoolId = session.user?.schoolId;

    let districtSchoolIds: string[] = [];

    if (userSchoolId) {
      const school = await db.school.findUnique({
        where: { id: userSchoolId },
        select: { districtId: true },
      });

      if (school?.districtId) {
        const districtSchools = await db.school.findMany({
          where: { districtId: school.districtId, deletedAt: null },
          select: { id: true, name: true },
        });
        districtSchoolIds = districtSchools.map((s) => s.id);
      }
    }

    // Build where clause: federation competitions that are either from the user's
    // district or public
    const where: Record<string, unknown> = {
      isFederation: true,
      deletedAt: null,
    };

    if (districtSchoolIds.length > 0) {
      where.OR = [
        { schoolId: { in: districtSchoolIds } },
        { isPublic: true },
      ];
    } else {
      where.isPublic = true;
    }

    if (categoryParam) where.category = categoryParam;
    if (scheduleParam) where.federationSchedule = scheduleParam;
    if (statusParam) where.status = statusParam;

    const [competitions, total] = await Promise.all([
      db.competition.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          school: { select: { id: true, name: true, primaryColor: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          _count: { select: { participants: true, rewards: true } },
        },
      }),
      db.competition.count({ where }),
    ]);

    // Compute school leaderboard for federation competitions
    const schoolLeaderboard: Array<{
      schoolId: string;
      schoolName: string;
      teamScore: number;
      participantCount: number;
      rank: number;
    }> = [];

    if (districtSchoolIds.length > 0) {
      // Get all participants from district schools in federation competitions
      const participants = await db.competitionParticipant.findMany({
        where: {
          competition: { isFederation: true, deletedAt: null },
          participantType: 'student',
        },
        include: {
          competition: {
            select: { id: true, schoolId: true },
          },
        },
      });

      // Group by school and sum top scores
      const schoolScores: Record<string, { name: string; scores: number[] }> = {};

      for (const sid of districtSchoolIds) {
        const school = await db.school.findUnique({
          where: { id: sid },
          select: { name: true },
        });
        if (school) {
          schoolScores[sid] = { name: school.name, scores: [] };
        }
      }

      // Get students from each school and their scores
      for (const p of participants) {
        const compSchoolId = p.competition.schoolId;
        if (schoolScores[compSchoolId]) {
          schoolScores[compSchoolId].scores.push(p.score);
        }
      }

      // Calculate team score (sum of top 10 student scores)
      const leaderboardEntries = Object.entries(schoolScores).map(([sid, data]) => {
        const sortedScores = [...data.scores].sort((a, b) => b - a);
        const teamScore = sortedScores.slice(0, 10).reduce((sum, s) => sum + s, 0);
        return {
          schoolId: sid,
          schoolName: data.name,
          teamScore,
          participantCount: data.scores.length,
          rank: 0,
        };
      });

      leaderboardEntries.sort((a, b) => b.teamScore - a.teamScore);
      leaderboardEntries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      schoolLeaderboard.push(...leaderboardEntries);
    }

    return NextResponse.json({ competitions, total, schoolLeaderboard });
  } catch (error) {
    console.error('Federation GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/competitions/federation — create federation comp ─────

async function createFederationCompetition(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createFederationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, startDate, endDate, registrationDeadline, schedule, category } = parsed.data;

    // Verify school access
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify school is part of a district
    if (!school.districtId) {
      return NextResponse.json(
        { error: 'School must be part of a district to create federation competitions' },
        { status: 400 }
      );
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
        competitionType: 'inter_school',
        category,
        subjectId: parsed.data.subjectId ?? null,
        status: 'registration',
        startDate: start,
        endDate: end,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        maxParticipants: parsed.data.maxParticipants ?? null,
        scoringType: 'points',
        rules: parsed.data.rules ?? null,
        isPublic: parsed.data.isPublic,
        isFederation: true,
        federationSchedule: schedule,
        createdById: session.user.id,
      },
      include: {
        school: { select: { id: true, name: true, primaryColor: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { participants: true, rewards: true } },
      },
    });

    // Create leaderboard entries for all schools in the district
    const districtSchools = await db.school.findMany({
      where: { districtId: school.districtId, deletedAt: null },
      select: { id: true, name: true },
    });

    for (const ds of districtSchools) {
      await db.competitionLeaderboard.create({
        data: {
          competitionId: competition.id,
          participantType: 'school',
          participantId: ds.id,
          participantName: ds.name,
          score: 0,
        },
      });
    }

    return NextResponse.json(competition, { status: 201 });
  } catch (error) {
    console.error('Federation POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getFederationCompetitions, 'dataRead');
export const POST = withRateLimit(createFederationCompetition, 'dataWrite');
// @ts-nocheck
