import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ─── GET /api/competitions/[id]/leaderboard ─────────────────────────

async function getLeaderboard(
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

    // Access control: authenticated users can see their own school's competitions or public ones
    // Also allow participants (e.g. inter-school competitions) and users without a schoolId viewing public ones
    const userSchoolId = session.user?.schoolId;
    const isSameSchool = userSchoolId === competition.schoolId;
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      !isSameSchool &&
      !competition.isPublic
    ) {
      // Check if the user is a participant in this competition
      const participant = await db.competitionParticipant.findFirst({
        where: {
          competitionId: id,
          userId: session.user!.id,
        },
      });
      if (!participant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const leaderboard = await db.competitionLeaderboard.findMany({
      where: { competitionId: id },
      orderBy: [{ rank: 'asc' }, { score: 'desc' }],
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getLeaderboard, 'dataRead');
