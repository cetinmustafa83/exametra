// CompetenceTrack — Announcement Read Receipt API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify announcement exists
  const announcement = await db.announcement.findUnique({
    where: { id, deletedAt: null },
  });

  if (!announcement) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }

  // Upsert read receipt
  const readReceipt = await db.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId: id,
        userId: session.user.id,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      announcementId: id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ readReceipt });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get all read receipts for this announcement
  const reads = await db.announcementRead.findMany({
    where: { announcementId: id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { readAt: 'desc' },
  });

  return NextResponse.json({ reads, totalReads: reads.length });
}
