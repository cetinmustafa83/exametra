import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getBadgeProgress } from '@/lib/badge-check';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'Missing schoolId or studentId' }, { status: 400 });
    }

    // Seed default badges if needed
    const { seedDefaultBadges } = await import('@/lib/badge-check');
    await seedDefaultBadges(schoolId);

    const progress = await getBadgeProgress(schoolId, studentId);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Badge-progress GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
