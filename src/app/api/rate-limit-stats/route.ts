import { NextResponse } from 'next/server';
import { getRateLimitStats } from '@/lib/rate-limit';

// GET /api/rate-limit-stats — Get rate limit statistics (admin monitoring)
export async function GET() {
  try {
    const stats = getRateLimitStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Rate limit stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
