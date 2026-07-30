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
    const event = await db.schoolEvent.findFirst({
      where: { id, deletedAt: null },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const feedbacks = await db.eventFeedback.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average rating
    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    return NextResponse.json({
      feedbacks,
      stats: {
        total: feedbacks.length,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingDistribution: [1, 2, 3, 4, 5].map(r => ({
          rating: r,
          count: feedbacks.filter(f => f.rating === r).length,
        })),
      },
    });
  } catch (error) {
    console.error('EventFeedback GET error:', error);
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
    const event = await db.schoolEvent.findFirst({
      where: { id, deletedAt: null },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Only allow feedback for completed events
    if (event.status !== 'completed' && new Date() < new Date(event.startDate)) {
      return NextResponse.json(
        { error: 'Feedback can only be submitted after the event has ended' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, rating, comment } = body;

    if (!userId || !rating) {
      return NextResponse.json({ error: 'userId and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if already submitted feedback
    const existing = await db.eventFeedback.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    const feedback = await db.eventFeedback.create({
      data: {
        eventId: id,
        userId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('EventFeedback POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
