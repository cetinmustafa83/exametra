import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function isAdmin(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const committee = await db.disciplinaryCommittee.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        cases: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            reporter: { select: { id: true, firstName: true, lastName: true } },
            reviewer: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(committee);
  } catch (error) {
    console.error('DisciplinaryCommittees GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, members } = body;

    const existing = await db.disciplinaryCommittee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle member updates
    if (members && Array.isArray(members)) {
      // Delete existing members and recreate
      await db.disciplinaryCommitteeMember.deleteMany({ where: { committeeId: id } });
      updateData.members = {
        create: members.map((m: { userId: string; role: string; isLead: boolean }) => ({
          userId: m.userId,
          role: m.role || 'member',
          isLead: m.isLead || false,
        })),
      };
    }

    const committee = await db.disciplinaryCommittee.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json(committee);
  } catch (error) {
    console.error('DisciplinaryCommittees PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.disciplinaryCommittee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Deactivate instead of deleting
    const committee = await db.disciplinaryCommittee.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(committee);
  } catch (error) {
    console.error('DisciplinaryCommittees DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
