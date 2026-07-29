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
    const comments = await db.gradingReviewComment.findMany({
      where: { reviewId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('GradingReviewComments GET error:', error);
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
    const body = await request.json();
    const { comment, suggestedGrade, reason, resultId } = body;

    if (!comment) {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 });
    }

    const existing = await db.teacherGradingReview.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const newComment = await db.gradingReviewComment.create({
      data: {
        reviewId: id,
        userId: session.userId,
        resultId: resultId || null,
        comment,
        suggestedGrade: suggestedGrade || null,
        reason: reason || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('GradingReviewComments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
