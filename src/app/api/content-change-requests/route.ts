import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── GET: List change requests ──
async function getChangeRequests(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user.schoolId;
    const status = searchParams.get('status');

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    // SCHOOL_ADMIN, VICE_PRINCIPAL see all; TEACHER sees own
    if (session.user.role === 'TEACHER') {
      where.requestedBy = session.userId;
    }

    const requests = await db.contentChangeRequest.findMany({
      where,
      include: {
        content: { select: { id: true, title: true, contentType: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('ContentChangeRequests GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create a change request ──
const createChangeRequestSchema = z.object({
  schoolId: z.string().optional(),
  contentId: z.string().min(1),
  requestType: z.enum(['edit', 'add', 'delete']),
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  proposedChanges: z.string().optional().nullable(),
});

async function createChangeRequest(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'TEACHER' &&
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schoolId = parsed.data.schoolId || session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'User must belong to a school' }, { status: 400 });
    }

    const changeRequest = await db.contentChangeRequest.create({
      data: {
        schoolId,
        contentId: parsed.data.contentId,
        requestedBy: session.userId,
        requestType: parsed.data.requestType,
        title: parsed.data.title,
        description: parsed.data.description,
        proposedChanges: parsed.data.proposedChanges,
      },
      include: {
        content: { select: { id: true, title: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error('ContentChangeRequest POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getChangeRequests, 'dataRead');
export const POST = withRateLimit(createChangeRequest, 'dataWrite');
