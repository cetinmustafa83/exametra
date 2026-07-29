import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isAdmin(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json([]);
    }

    const committees = await db.disciplinaryCommittee.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        _count: { select: { cases: true } },
      },
    });

    return NextResponse.json(committees);
  } catch (error) {
    console.error('DisciplinaryCommittees GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, name, description, members } = body;

    if (!schoolId || !name) {
      return NextResponse.json({ error: 'schoolId and name are required' }, { status: 400 });
    }

    const committee = await db.disciplinaryCommittee.create({
      data: {
        schoolId,
        name,
        description: description || null,
        isActive: true,
        members: members?.length
          ? {
              create: members.map((m: { userId: string; role: string; isLead: boolean }) => ({
                userId: m.userId,
                role: m.role || 'member',
                isLead: m.isLead || false,
              })),
            }
          : undefined,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json(committee, { status: 201 });
  } catch (error) {
    console.error('DisciplinaryCommittees POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
