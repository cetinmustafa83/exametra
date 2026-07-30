import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List career appointments ────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const profileId = searchParams.get('profileId');
    const counselorId = searchParams.get('counselorId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };
    if (profileId) where.profileId = profileId;
    if (counselorId) where.counselorId = counselorId;
    if (status) where.status = status;
    if (type) where.type = type;

    // Role-based access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (student) {
        const profile = await db.careerProfile.findFirst({
          where: { studentId: student.id },
          select: { id: true },
        });
        if (profile) {
          where.profileId = profile.id;
        }
      }
    } else if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      const profiles = await db.careerProfile.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const profileIds = profiles.map((p) => p.id);
      where.profileId = { in: profileIds };
    } else if (session.user?.role === 'TEACHER') {
      // Teachers see appointments where they are the counselor
      if (!counselorId) {
        where.counselorId = session.userId;
      }
    }

    const appointments = await db.careerAppointment.findMany({
      where,
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        profile: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Career appointments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create career appointment ──────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId, profileId, counselorId, date, duration, type, notes } = body;

    if (!schoolId || !profileId || !counselorId || !date) {
      return NextResponse.json(
        { error: 'schoolId, profileId, counselorId, and date are required' },
        { status: 400 }
      );
    }

    const appointment = await db.careerAppointment.create({
      data: {
        schoolId,
        profileId,
        counselorId,
        date: new Date(date),
        duration: duration || 30,
        type: type || 'guidance',
        notes: notes || null,
      },
      include: {
        counselor: { select: { id: true, firstName: true, lastName: true } },
        profile: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Career appointments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
