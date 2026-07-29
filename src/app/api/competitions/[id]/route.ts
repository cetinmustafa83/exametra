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

const updateCompetitionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  competitionType: competitionTypeEnum.optional(),
  category: categoryEnum.optional(),
  subjectId: z.string().optional().nullable(),
  status: statusEnum.optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  registrationDeadline: z.string().optional().nullable(),
  maxParticipants: z.number().int().min(1).optional().nullable(),
  scoringType: scoringTypeEnum.optional(),
  rules: z.string().max(20000).optional().nullable(),
  isPublic: z.boolean().optional(),
});

const registerParticipantSchema = z.object({
  action: z.literal('register'),
  participantType: z.enum(['student', 'class_group', 'school']),
  participantId: z.string().min(1),
  userId: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updateScoreSchema = z.object({
  action: z.literal('update_score'),
  participantId: z.string().min(1),
  participantType: z.enum(['student', 'class_group', 'school']),
  score: z.number().int().min(0),
  isDisqualified: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

const actionSchema = z.discriminatedUnion('action', [
  registerParticipantSchema,
  updateScoreSchema,
]);

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

// ─── GET /api/competitions/[id] — get single competition ────────────

async function getCompetition(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const competition = await db.competition.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        participants: {
          orderBy: { score: 'desc' },
        },
        rewards: true,
        leaderboard: {
          orderBy: { rank: 'asc' },
        },
        _count: { select: { claims: true } },
      },
    });

    if (!competition || competition.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Access control: non-admins can only see their own school's competitions or public ones
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.schoolId !== competition.schoolId &&
      !competition.isPublic
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(competition);
  } catch (error) {
    console.error('Competition GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT /api/competitions/[id] — update competition ────────────────

async function updateCompetition(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.competition.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role === 'TEACHER' && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateCompetitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.competitionType !== undefined) data.competitionType = parsed.data.competitionType;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.subjectId !== undefined) data.subjectId = parsed.data.subjectId;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.startDate !== undefined) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate !== undefined) data.endDate = new Date(parsed.data.endDate);
    if (parsed.data.registrationDeadline !== undefined) {
      data.registrationDeadline = parsed.data.registrationDeadline
        ? new Date(parsed.data.registrationDeadline)
        : null;
    }
    if (parsed.data.maxParticipants !== undefined) data.maxParticipants = parsed.data.maxParticipants;
    if (parsed.data.scoringType !== undefined) data.scoringType = parsed.data.scoringType;
    if (parsed.data.rules !== undefined) data.rules = parsed.data.rules;
    if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;

    const competition = await db.competition.update({
      where: { id },
      data,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { participants: true, rewards: true } },
      },
    });

    return NextResponse.json(competition);
  } catch (error) {
    console.error('Competition PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/competitions/[id] — register participant or update score ──

async function competitionAction(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const competition = await db.competition.findUnique({ where: { id } });
    if (!competition || competition.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId !== competition.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'register') {
      // Check if already registered
      const existingParticipant = await db.competitionParticipant.findUnique({
        where: {
          competitionId_participantType_participantId: {
            competitionId: id,
            participantType: parsed.data.participantType,
            participantId: parsed.data.participantId,
          },
        },
      });

      if (existingParticipant) {
        return NextResponse.json(
          { error: 'Participant already registered' },
          { status: 409 }
        );
      }

      // Check max participants
      if (competition.maxParticipants) {
        const currentCount = await db.competitionParticipant.count({
          where: { competitionId: id },
        });
        if (currentCount >= competition.maxParticipants) {
          return NextResponse.json(
            { error: 'Maximum participants reached' },
            { status: 400 }
          );
        }
      }

      // Check registration deadline
      if (competition.registrationDeadline && new Date() > competition.registrationDeadline) {
        return NextResponse.json(
          { error: 'Registration deadline has passed' },
          { status: 400 }
        );
      }

      const participant = await db.competitionParticipant.create({
        data: {
          competitionId: id,
          participantType: parsed.data.participantType,
          participantId: parsed.data.participantId,
          userId: parsed.data.userId ?? null,
          notes: parsed.data.notes ?? null,
        },
      });

      // Also create leaderboard entry
      let participantName = parsed.data.participantId;
      if (parsed.data.participantType === 'student' && parsed.data.userId) {
        const user = await db.user.findUnique({
          where: { id: parsed.data.userId },
          select: { firstName: true, lastName: true },
        });
        if (user) participantName = `${user.firstName} ${user.lastName}`;
      } else if (parsed.data.participantType === 'class_group') {
        const classGroup = await db.classGroup.findUnique({
          where: { id: parsed.data.participantId },
          select: { name: true },
        });
        if (classGroup) participantName = classGroup.name;
      } else if (parsed.data.participantType === 'school') {
        const school = await db.school.findUnique({
          where: { id: parsed.data.participantId },
          select: { name: true },
        });
        if (school) participantName = school.name;
      }

      await db.competitionLeaderboard.upsert({
        where: {
          competitionId_participantType_participantId: {
            competitionId: id,
            participantType: parsed.data.participantType,
            participantId: parsed.data.participantId,
          },
        },
        create: {
          competitionId: id,
          participantType: parsed.data.participantType,
          participantId: parsed.data.participantId,
          participantName,
          score: 0,
        },
        update: {
          participantName,
        },
      });

      return NextResponse.json(participant, { status: 201 });
    }

    if (parsed.data.action === 'update_score') {
      const participant = await db.competitionParticipant.findUnique({
        where: {
          competitionId_participantType_participantId: {
            competitionId: id,
            participantType: parsed.data.participantType,
            participantId: parsed.data.participantId,
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: 'Participant not found' },
          { status: 404 }
        );
      }

      const updatedParticipant = await db.competitionParticipant.update({
        where: { id: participant.id },
        data: {
          score: parsed.data.score,
          isDisqualified: parsed.data.isDisqualified ?? participant.isDisqualified,
          notes: parsed.data.notes ?? participant.notes,
        },
      });

      // Update leaderboard
      await db.competitionLeaderboard.upsert({
        where: {
          competitionId_participantType_participantId: {
            competitionId: id,
            participantType: parsed.data.participantType,
            participantId: parsed.data.participantId,
          },
        },
        create: {
          competitionId: id,
          participantType: parsed.data.participantType,
          participantId: parsed.data.participantId,
          participantName: parsed.data.participantId,
          score: parsed.data.score,
        },
        update: {
          score: parsed.data.score,
        },
      });

      // Recalculate ranks for this competition
      const entries = await db.competitionLeaderboard.findMany({
        where: { competitionId: id },
        orderBy: { score: 'desc' },
      });

      for (let i = 0; i < entries.length; i++) {
        await db.competitionLeaderboard.update({
          where: { id: entries[i].id },
          data: { rank: i + 1 },
        });
      }

      // Also update participant rank
      const rank = entries.findIndex(
        (e) =>
          e.participantType === parsed.data.participantType &&
          e.participantId === parsed.data.participantId
      ) + 1;

      await db.competitionParticipant.update({
        where: { id: participant.id },
        data: { rank: rank || null },
      });

      return NextResponse.json(updatedParticipant);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Competition POST action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/competitions/[id] — soft delete competition ────────

async function deleteCompetition(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.competition.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role === 'TEACHER' && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.competition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Competition DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getCompetition, 'dataRead');
export const PUT = withRateLimit(updateCompetition, 'dataWrite');
export const POST = withRateLimit(competitionAction, 'dataWrite');
export const DELETE = withRateLimit(deleteCompetition, 'dataWrite');
