import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get student career profile ──────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const profileId = searchParams.get('profileId');
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };
    if (profileId) where.id = profileId;
    if (studentId) where.studentId = studentId;

    // Role-based access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (student) {
        where.studentId = student.id;
      }
    } else if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      where.studentId = { in: studentIds };
    }

    const profiles = await db.careerProfile.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        goals: { orderBy: { createdAt: 'desc' } },
        appointments: {
          include: {
            counselor: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    // Return single profile if profileId or studentId specified
    if (profileId || studentId) {
      const profile = profiles[0] || null;
      return NextResponse.json(profile);
    }

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Career profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update career profile ──────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, interests, strengths, careerCluster, desiredCareer, educationPath,
            workExperiences, volunteerExps, certifications, documents, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Profile id is required' }, { status: 400 });
    }

    const existing = await db.careerProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Role-based access: students can update own, teachers/admins can update any
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    } else if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      if (!studentIds.includes(existing.studentId)) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (interests !== undefined) updateData.interests = JSON.stringify(interests);
    if (strengths !== undefined) updateData.strengths = JSON.stringify(strengths);
    if (careerCluster !== undefined) updateData.careerCluster = careerCluster;
    if (desiredCareer !== undefined) updateData.desiredCareer = desiredCareer;
    if (educationPath !== undefined) updateData.educationPath = educationPath;
    if (workExperiences !== undefined) updateData.workExperiences = JSON.stringify(workExperiences);
    if (volunteerExps !== undefined) updateData.volunteerExps = JSON.stringify(volunteerExps);
    if (certifications !== undefined) updateData.certifications = JSON.stringify(certifications);
    if (documents !== undefined) updateData.documents = JSON.stringify(documents);
    if (notes !== undefined) updateData.notes = notes;

    const profile = await db.careerProfile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Career profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
