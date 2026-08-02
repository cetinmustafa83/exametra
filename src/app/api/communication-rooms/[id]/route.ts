import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessRoom, canEscalateToAdmin } from '@/lib/communication-policy';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const room = await db.communicationRoom.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    // Direct student rooms remain private until explicitly escalated.
    if (role === 'PARENT') {
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, student: { userId: room.studentId } },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (!canAccessRoom(role, room, userId, session.user?.schoolId ?? null)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('CommunicationRoom GET [id] error:', error);
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

    const { id } = await params;
    const room = await db.communicationRoom.findUnique({ where: { id } });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const role = session.user?.role;
    const userId = session.userId;
    const body = await request.json();

    if (body.action === 'escalate') {
      if (role !== 'STUDENT' && role !== 'PARENT') {
        return NextResponse.json({ error: 'Only students or parents can escalate' }, { status: 403 });
      }
      if (role === 'STUDENT' && room.studentId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (role === 'PARENT') {
        const student = await db.student.findFirst({ where: { userId: room.studentId }, select: { id: true } });
        const link = student && await db.parentStudentLink.findFirst({ where: { parentId: userId, studentId: student.id }, select: { id: true } });
        if (!link) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!canEscalateToAdmin(room)) {
        return NextResponse.json({ error: 'Escalation becomes available after five business days without resolution' }, { status: 400 });
      }
      const admin = await db.user.findFirst({ where: { schoolId: room.schoolId, role: 'SCHOOL_ADMIN', deletedAt: null }, select: { id: true } });
      if (!admin) return NextResponse.json({ error: 'No school administrator is assigned' }, { status: 400 });
      await db.communicationRoomMember.upsert({
        where: { roomId_userId: { roomId: id, userId: admin.id } },
        update: { role: 'moderator' },
        create: { roomId: id, userId: admin.id, role: 'moderator' },
      });
      return NextResponse.json(await db.communicationRoom.update({ where: { id }, data: { escalatedAt: new Date(), resolutionStatus: 'unresolved' } }));
    }

    // Teacher accepts a room
    if (body.status === 'active' && room.status === 'requested') {
      if (role !== 'TEACHER' || room.teacherId !== userId) {
        return NextResponse.json({ error: 'Only the assigned teacher can accept' }, { status: 403 });
      }

      const updated = await db.communicationRoom.update({
        where: { id },
        data: {
          status: 'active',
          acceptedAt: new Date(),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // Teacher or admin closes a room
    if (body.status === 'closed') {
      if (role !== 'TEACHER' || room.teacherId !== userId) {
        if (role !== 'SCHOOL_ADMIN' && role !== 'VICE_PRINCIPAL' && role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const updated = await db.communicationRoom.update({
        where: { id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason: body.closeReason || null,
          resolvedAt: body.resolved ? new Date() : null,
          resolutionStatus: body.resolved ? 'resolved' : 'unresolved',
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // Teacher rejects a room request
    if (body.status === 'rejected' && room.status === 'requested') {
      if (role !== 'TEACHER' || room.teacherId !== userId) {
        return NextResponse.json({ error: 'Only the assigned teacher can reject' }, { status: 403 });
      }

      const updated = await db.communicationRoom.update({
        where: { id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason: body.closeReason || 'Request rejected',
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
  } catch (error) {
    console.error('CommunicationRoom PUT [id] error:', error);
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

    const { id } = await params;
    const room = await db.communicationRoom.findUnique({ where: { id } });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const role = session.user?.role;

    // Only admin can delete rooms
    if (role !== 'SUPER_ADMIN' && role !== 'SCHOOL_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Only admins can delete rooms' }, { status: 403 });
    }

    await db.communicationMessage.deleteMany({ where: { roomId: id } });
    await db.communicationRoomMember.deleteMany({ where: { roomId: id } });
    await db.communicationRoom.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CommunicationRoom DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
