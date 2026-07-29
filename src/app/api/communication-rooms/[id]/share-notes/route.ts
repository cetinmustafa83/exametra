import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ─── GET /api/communication-rooms/[id]/share-notes ──────────────────
// Get shared notebooks in a communication room

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
    const room = await db.communicationRoom.findUnique({ where: { id } });

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
    } else if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      if (room.schoolId !== session.user?.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get messages of type note_share in this room
    const sharedNotes = await db.communicationMessage.findMany({
      where: {
        roomId: id,
        messageType: 'note_share',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Parse metadata for each shared note
    const enrichedNotes = sharedNotes.map((msg) => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = msg.metadata ? JSON.parse(msg.metadata) : {};
      } catch {
        // ignore parse errors
      }
      return {
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        sender: msg.sender,
        createdAt: msg.createdAt,
        notebookId: metadata.notebookId as string | undefined,
        notebookTitle: metadata.notebookTitle as string | undefined,
        notebookColor: metadata.notebookColor as string | undefined,
      };
    });

    return NextResponse.json({ sharedNotes: enrichedNotes });
  } catch (error) {
    console.error('Share-notes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/communication-rooms/[id]/share-notes ─────────────────
// Share a notebook with the teacher in the room

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

    // Only the student can share notes in their room
    if (room.studentId !== userId && room.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (room.status !== 'active') {
      return NextResponse.json({ error: 'Room is not active' }, { status: 400 });
    }

    const body = await request.json();
    const { notebookId } = body;

    if (!notebookId) {
      return NextResponse.json({ error: 'notebookId is required' }, { status: 400 });
    }

    // Verify the notebook exists and belongs to the user
    const notebook = await db.notebook.findFirst({
      where: {
        id: notebookId,
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        pages: {
          select: { id: true, title: true, textContent: true, pageNumber: true },
          orderBy: { pageNumber: 'asc' },
          take: 5,
        },
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found or not owned by you' }, { status: 404 });
    }

    // Create a note_share message
    const metadata = JSON.stringify({
      notebookId: notebook.id,
      notebookTitle: notebook.title,
      notebookColor: notebook.color,
      notebookType: notebook.notebookType,
      pageCount: notebook.pages.length,
      sharedPages: notebook.pages.map((p) => ({
        id: p.id,
        title: p.title,
        pageNumber: p.pageNumber,
      })),
    });

    const message = await db.communicationMessage.create({
      data: {
        roomId: id,
        senderId: userId,
        content: notebook.title,
        messageType: 'note_share',
        metadata,
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
    console.error('Share-notes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
