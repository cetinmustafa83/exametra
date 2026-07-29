// CompetenceTrack — Single Notification API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const notification = await db.notification.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json(notification);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { isRead, isArchived, action } = body as {
      isRead?: boolean;
      isArchived?: boolean;
      action?: 'read' | 'unread' | 'archive' | 'unarchive' | 'dismiss';
    };

    const existing = await db.notification.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (action === 'read' || isRead === true) {
      updateData.isRead = true;
    } else if (action === 'unread' || isRead === false) {
      updateData.isRead = false;
    }
    if (action === 'archive' || isArchived === true) {
      updateData.isArchived = true;
    } else if (action === 'unarchive' || isArchived === false) {
      updateData.isArchived = false;
    }
    if (action === 'dismiss') {
      updateData.deletedAt = new Date();
    }

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ notification });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.notification.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  await db.notification.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
