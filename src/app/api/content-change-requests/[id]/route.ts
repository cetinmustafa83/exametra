import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// ── PUT: Approve or reject a change request ──
const updateChangeRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(2000).optional().nullable(),
});

async function updateChangeRequest(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const changeRequest = await db.contentChangeRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewedBy: session.userId,
        reviewNote: parsed.data.reviewNote,
      },
      include: {
        content: { select: { id: true, title: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // If approved and it's an edit request, apply the proposed changes to the content
    if (parsed.data.status === 'approved' && changeRequest.proposedChanges) {
      try {
        const proposed = JSON.parse(changeRequest.proposedChanges);
        if (changeRequest.content?.id && proposed) {
          await db.subjectContent.update({
            where: { id: changeRequest.contentId },
            data: proposed,
          });
        }
      } catch {
        // If proposed changes are not valid JSON, skip auto-apply
      }
    }

    return NextResponse.json(changeRequest);
  } catch (error) {
    console.error('ContentChangeRequest PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = withRateLimit(updateChangeRequest, 'dataWrite');
