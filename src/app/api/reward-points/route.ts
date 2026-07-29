import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/reward-points — Get points balance and history
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Fetch points entries
    const pointsEntries = await db.rewardPoints.findMany({
      where: { userId, schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch redemptions (spent points)
    const redemptions = await db.rewardRedemption.findMany({
      where: { userId, status: { in: ['pending', 'approved', 'fulfilled'] } },
      include: { reward: { select: { title: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Calculate balance
    const totalEarned = pointsEntries.reduce((sum, e) => sum + e.points, 0);
    const totalSpent = redemptions.reduce((sum, r) => sum + r.pointsSpent, 0);
    const balance = totalEarned - totalSpent;

    return NextResponse.json({
      balance,
      totalEarned,
      totalSpent,
      pointsHistory: pointsEntries,
      redemptions,
    });
  } catch (error) {
    console.error('Error fetching reward points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reward-points — Award points to a user
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const schoolId = session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 });
    }

    const body = await request.json();
    const { userId, points, source, sourceId, description } = body;

    if (!userId || !points || !source) {
      return NextResponse.json({ error: 'userId, points, and source are required' }, { status: 400 });
    }

    const validSources = ['competition', 'grade', 'attendance', 'homework', 'bonus'];
    if (!validSources.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Verify the target user belongs to the same school
    const targetUser = await db.user.findFirst({
      where: { id: userId, schoolId, deletedAt: null },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found in your school' }, { status: 404 });
    }

    const pointsEntry = await db.rewardPoints.create({
      data: {
        userId,
        schoolId,
        points: parseInt(String(points), 10),
        source,
        sourceId: sourceId || null,
        description: description || null,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'POINTS_AWARDED',
        entityType: 'RewardPoints',
        entityId: pointsEntry.id,
        changes: JSON.stringify({
          targetUserId: userId,
          points: pointsEntry.points,
          source,
          description: description || null,
        }),
      },
    });

    return NextResponse.json(pointsEntry, { status: 201 });
  } catch (error) {
    console.error('Error awarding points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
