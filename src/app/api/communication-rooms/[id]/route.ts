import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    // Access control
    if (role === 'STUDENT' && room.studentId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (role === 'TEACHER' && room.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (role === 'PARENT') {
      const parentLink = await db.parentStudentLink.findFirst({
        where: { parentId: userId, studentId: room.studentId },
      });
      if (!parentLink) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      if (room.schoolId !== session.user?.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
