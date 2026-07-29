import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ─── Validation ─────────────────────────────────────────────────────

const rewardTypeEnum = z.enum(['digital_code', 'badge', 'certificate', 'experience', 'physical']);
const rewardProviderEnum = z.enum([
  'netflix', 'amazon', 'cinema', 'theater', 'concert', 'custom',
]);

const createRewardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  rewardType: rewardTypeEnum,
  rewardValue: z.string().max(1000).optional().nullable(),
  rewardProvider: rewardProviderEnum.optional().nullable(),
  rankRequirement: z.number().int().min(1).optional().nullable(),
  pointsRequired: z.number().int().min(0).optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  imageUrl: z.string().max(500).optional().nullable(),
  isDemo: z.boolean().default(false),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

// ─── GET /api/competitions/[id]/rewards ─────────────────────────────

async function getRewards(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const competition = await db.competition.findUnique({
      where: { id },
      select: { id: true, schoolId: true, isPublic: true, deletedAt: true },
    });

    if (!competition || competition.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Access control
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.schoolId !== competition.schoolId &&
      !competition.isPublic
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rewards = await db.competitionReward.findMany({
      where: { competitionId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { claims: true } },
      },
    });

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Competition rewards GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/competitions/[id]/rewards ────────────────────────────

async function createReward(
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

    const competition = await db.competition.findUnique({
      where: { id },
      select: { id: true, schoolId: true, deletedAt: true },
    });

    if (!competition || competition.deletedAt) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId !== competition.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const reward = await db.competitionReward.create({
      data: {
        competitionId: id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        rewardType: parsed.data.rewardType,
        rewardValue: parsed.data.rewardValue ?? null,
        rewardProvider: parsed.data.rewardProvider ?? null,
        rankRequirement: parsed.data.rankRequirement ?? null,
        pointsRequired: parsed.data.pointsRequired ?? null,
        quantity: parsed.data.quantity,
        imageUrl: parsed.data.imageUrl ?? null,
        isDemo: parsed.data.isDemo,
      },
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error('Competition rewards POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getRewards, 'dataRead');
export const POST = withRateLimit(createReward, 'dataWrite');
