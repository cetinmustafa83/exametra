import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessRoom } from '@/lib/communication-policy';

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.communicationMessage.findMany({
        where: { roomId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      db.communicationMessage.count({ where: { roomId: id } }),
    ]);

    // Mark messages as read for the current user
    await db.communicationMessage.updateMany({
      where: {
        roomId: id,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ messages, total, page, limit });
  } catch (error) {
    console.error('CommunicationMessage GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    const membership = await db.communicationRoomMember.findUnique({
      where: { roomId_userId: { roomId: id, userId } },
      select: { id: true },
    });
    const isSchoolAdministrator = (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') && room.escalatedAt;
    if (!membership && !isSchoolAdministrator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (room.status !== 'active') {
      return NextResponse.json({ error: 'Room is not active' }, { status: 400 });
    }

    const body = await request.json();
    const { content, messageType, fileUrl, metadata } = body;

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Content or fileUrl is required' }, { status: 400 });
    }

    const message = await db.communicationMessage.create({
      data: {
        roomId: id,
        senderId: userId,
        content: content || '',
        messageType: messageType || 'text',
        fileUrl: fileUrl || null,
        metadata: metadata || null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Update room's updatedAt
    await db.communicationRoom.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('CommunicationMessage POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
