import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST /api/rewards/redeem — Redeem a reward
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.userId;
    const schoolId = session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 });
    }

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json({ error: 'rewardId is required' }, { status: 400 });
    }

    // Fetch the reward
    const reward = await db.reward.findFirst({
      where: { id: rewardId, deletedAt: null, isActive: true },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found or inactive' }, { status: 404 });
    }

    // Check stock
    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'Out of stock' }, { status: 400 });
    }

    // Calculate user's current points balance
    const pointsEntries = await db.rewardPoints.findMany({
      where: { userId, schoolId },
      select: { points: true },
    });
    const totalEarned = pointsEntries.reduce((sum, e) => sum + e.points, 0);

    const redemptions = await db.rewardRedemption.findMany({
      where: { userId, status: { in: ['pending', 'approved', 'fulfilled'] } },
      select: { pointsSpent: true },
    });
    const totalSpent = redemptions.reduce((sum, r) => sum + r.pointsSpent, 0);
    const currentBalance = totalEarned - totalSpent;

    // Check if user has enough points
    if (currentBalance < reward.pointsCost) {
      return NextResponse.json(
        { error: 'Insufficient points', currentBalance, pointsCost: reward.pointsCost },
        { status: 400 }
      );
    }

    // Create redemption
    const redemption = await db.rewardRedemption.create({
      data: {
        rewardId,
        userId,
        pointsSpent: reward.pointsCost,
        status: 'pending',
      },
    });

    // Decrement stock if applicable
    if (reward.stock !== null) {
      await db.reward.update({
        where: { id: rewardId },
        data: { stock: reward.stock - 1 },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        schoolId,
        action: 'REWARD_REDEEMED',
        entityType: 'Reward',
        entityId: rewardId,
        changes: JSON.stringify({
          rewardTitle: reward.title,
          pointsSpent: reward.pointsCost,
          redemptionId: redemption.id,
        }),
      },
    });

    return NextResponse.json({
      ...redemption,
      newBalance: currentBalance - reward.pointsCost,
    }, { status: 201 });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
