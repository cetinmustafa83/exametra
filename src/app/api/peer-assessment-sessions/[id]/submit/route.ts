import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
    const { assessmentId, criteria, level, comment } = body;

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

    // Verify the session exists and is active
    const assessmentSession = await db.peerAssessmentSession.findFirst({
      where: { id, deletedAt: null },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (assessmentSession.status === 'closed') {
      return NextResponse.json({ error: 'Session is closed' }, { status: 400 });
    }

    // Check deadline
    if (assessmentSession.deadline && new Date() > assessmentSession.deadline) {
      return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 });
    }

    // Verify the assessment belongs to this session
    const assessment = await db.peerAssessment.findFirst({
      where: { id: assessmentId, sessionId: id, deletedAt: null },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found in this session' }, { status: 404 });
    }

    // For students: verify they are the assessor
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id, deletedAt: null },
      });
      if (!student || student.id !== assessment.assessorId) {
        return NextResponse.json({ error: 'You can only submit your own assessments' }, { status: 403 });
      }
    }

    // Update the assessment
    const updated = await db.peerAssessment.update({
      where: { id: assessmentId },
      data: {
        criteria: criteria ? JSON.stringify(criteria) : assessment.criteria,
        level: level ?? assessment.level,
        comment: comment ?? assessment.comment,
        status: 'submitted',
      },
      include: {
        assessor: {
          select: { id: true, firstName: true, lastName: true },
        },
        assessed: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Check if all assessments in session are submitted
    const pendingCount = await db.peerAssessment.count({
      where: { sessionId: id, status: 'pending', deletedAt: null },
    });

    if (pendingCount === 0) {
      await db.peerAssessmentSession.update({
        where: { id },
        data: { status: 'completed' },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PeerAssessmentSession submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
