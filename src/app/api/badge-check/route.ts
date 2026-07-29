import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { seedDefaultBadges } from '@/lib/badge-check';

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isTeacherOrAdmin(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { schoolId, studentId } = body;

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'Missing schoolId or studentId' }, { status: 400 });
    }

    // Seed default badges if needed
    await seedDefaultBadges(schoolId);

    // Check and award
    const { checkAndAwardBadges } = await import('@/lib/badge-check');
    const awarded = await checkAndAwardBadges(schoolId, studentId);

    return NextResponse.json({ awarded });
  } catch (error) {
    console.error('Badge-check POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
