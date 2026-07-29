import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ─── Validation ─────────────────────────────────────────────────────

const claimRewardSchema = z.object({
  competitionId: z.string().min(1),
  rewardId: z.string().min(1),
  code: z.string().max(500).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isDemo: z.boolean().default(false),
});

// ─── GET /api/reward-claims — list my claims (or all for admin) ─────

async function getRewardClaims(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const competitionIdParam = searchParams.get('competitionId');
    const statusParam = searchParams.get('status');

    const where: Record<string, unknown> = {};

    // Students can only see their own claims
    if (session.user?.role === 'STUDENT') {
      where.userId = session.user.id;
    } else if (session.user?.role === 'PARENT') {
      // Parents can see claims linked to their children
      where.userId = session.user.id;
    } else {
      // Teachers/admins can see claims for their school
      const schoolIdParam = searchParams.get('schoolId');
      const schoolId = session.user?.role === 'SCHOOL_ADMIN'
        ? session.user.schoolId
        : schoolIdParam ?? session.user?.schoolId;
      if (schoolId) where.schoolId = schoolId;
    }

    if (competitionIdParam) where.competitionId = competitionIdParam;
    if (statusParam) where.status = statusParam;

    const claims = await db.rewardClaim.findMany({
      where,
      orderBy: { claimedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, title: true, competitionType: true } },
        reward: { select: { id: true, name: true, rewardType: true, rewardProvider: true, imageUrl: true } },
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Reward claims GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/reward-claims — claim a reward ──────────────────────

async function claimReward(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const parsed = claimRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { competitionId, rewardId, code, expiresAt, notes, isDemo } = parsed.data;

    // Get the reward and competition
    const [reward, competition] = await Promise.all([
      db.competitionReward.findUnique({ where: { id: rewardId } }),
      db.competition.findUnique({ where: { id: competitionId } }),
    ]);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }
    if (!competition || competition.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Verify competition is completed or active
    if (competition.status !== 'completed' && competition.status !== 'active') {
      return NextResponse.json(
        { error: 'Competition is not active or completed' },
        { status: 400 }
      );
    }

    // Check if reward is still available
    if (reward.claimedCount >= reward.quantity) {
      return NextResponse.json(
        { error: 'Reward is no longer available' },
        { status: 400 }
      );
    }

    // Check if user already claimed this reward
    const existingClaim = await db.rewardClaim.findFirst({
      where: {
        rewardId,
        userId: session.user.id,
        status: { notIn: ['revoked', 'expired'] },
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 409 }
      );
    }

    // Check eligibility (rank or points requirement)
    if (session.user?.role === 'STUDENT' || session.user?.role === 'TEACHER') {
      const participant = await db.competitionParticipant.findFirst({
        where: {
          competitionId,
          userId: session.user.id,
          isDisqualified: false,
        },
      });

      if (reward.rankRequirement && participant?.rank && participant.rank > reward.rankRequirement) {
        return NextResponse.json(
          { error: 'Rank requirement not met' },
          { status: 403 }
        );
      }

      if (reward.pointsRequired && participant && participant.score < reward.pointsRequired) {
        return NextResponse.json(
          { error: 'Points requirement not met' },
          { status: 403 }
        );
      }
    }

    // DSGVO compliance: For digital codes, the code field stores the promo code
    // In production, this should be encrypted at rest
    const schoolId = session.user?.schoolId || competition.schoolId;

    const claim = await db.rewardClaim.create({
      data: {
        schoolId,
        competitionId,
        rewardId,
        userId: session.user.id,
        code: code ?? null,
        status: 'claimed',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes ?? null,
        isDemo: isDemo,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, title: true } },
        reward: { select: { id: true, name: true, rewardType: true, rewardProvider: true, imageUrl: true } },
      },
    });

    // Increment claimed count
    await db.competitionReward.update({
      where: { id: rewardId },
      data: { claimedCount: { increment: 1 } },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error('Reward claim POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getRewardClaims, 'dataRead');
export const POST = withRateLimit(claimReward, 'dataWrite');
