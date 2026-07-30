import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get career data (clusters, career profiles for school-wide stats) ──
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // Get career profiles for statistics
    const profiles = await db.careerProfile.findMany({
      where: { schoolId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        goals: true,
        appointments: {
          where: { status: 'scheduled' },
          take: 5,
          orderBy: { date: 'asc' },
        },
      },
    });

    // Career cluster distribution
    const clusterCounts: Record<string, number> = {};
    profiles.forEach((p) => {
      const cluster = p.careerCluster || 'unassigned';
      clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
    });

    // Education path distribution
    const pathCounts: Record<string, number> = {};
    profiles.forEach((p) => {
      const path = p.educationPath || 'unassigned';
      pathCounts[path] = (pathCounts[path] || 0) + 1;
    });

    // Goal stats
    const allGoals = profiles.flatMap((p) => p.goals);
    const goalStats = {
      total: allGoals.length,
      active: allGoals.filter((g) => g.status === 'active').length,
      completed: allGoals.filter((g) => g.status === 'completed').length,
      avgProgress: allGoals.length > 0
        ? Math.round(allGoals.reduce((sum, g) => sum + g.progress, 0) / allGoals.length)
        : 0,
    };

    // Appointment stats
    const allAppointments = await db.careerAppointment.findMany({
      where: { schoolId },
    });
    const appointmentStats = {
      total: allAppointments.length,
      scheduled: allAppointments.filter((a) => a.status === 'scheduled').length,
      completed: allAppointments.filter((a) => a.status === 'completed').length,
      cancelled: allAppointments.filter((a) => a.status === 'cancelled').length,
    };

    return NextResponse.json({
      profiles,
      stats: {
        totalProfiles: profiles.length,
        clusterCounts,
        pathCounts,
        goalStats,
        appointmentStats,
      },
    });
  } catch (error) {
    console.error('Career GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create career profile ──────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId, studentId, interests, strengths, careerCluster, desiredCareer, educationPath } = body;

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'schoolId and studentId are required' }, { status: 400 });
    }

    // Check if profile already exists
    const existing = await db.careerProfile.findFirst({
      where: { schoolId, studentId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Career profile already exists for this student' }, { status: 409 });
    }

    const profile = await db.careerProfile.create({
      data: {
        schoolId,
        studentId,
        interests: interests ? JSON.stringify(interests) : null,
        strengths: strengths ? JSON.stringify(strengths) : null,
        careerCluster: careerCluster || null,
        desiredCareer: desiredCareer || null,
        educationPath: educationPath || null,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Career POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
