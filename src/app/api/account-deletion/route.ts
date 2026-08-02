// @ts-nocheck
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, verifyPassword } from '@/lib/auth';

const requestDeletionSchema = z.object({
  password: z.string().min(1),
});

const GRACE_PERIOD_DAYS = 30;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestDeletionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const userId = session.userId;

    // Fetch the user with password hash
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, deletedAt: true, role: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already scheduled for deletion
    if (user.deletedAt) {
      const deletionDate = new Date(user.deletedAt);
      deletionDate.setDate(deletionDate.getDate() + GRACE_PERIOD_DAYS);
      return NextResponse.json({
        error: 'Account already scheduled for deletion',
        scheduledDeletionDate: deletionDate.toISOString(),
      }, { status: 409 });
    }

    // Verify password
    const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 403 });
    }

    // Soft delete: set deletedAt to now
    const now = new Date();
    const scheduledDeletionDate = new Date(now);
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + GRACE_PERIOD_DAYS);

    await db.user.update({
      where: { id: userId },
      data: { deletedAt: now },
    });

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'ACCOUNT_DELETION_REQUESTED',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({
          scheduledDeletionDate: scheduledDeletionDate.toISOString(),
          gracePeriodDays: GRACE_PERIOD_DAYS,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      scheduledDeletionDate: scheduledDeletionDate.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
      message: `Account scheduled for deletion in ${GRACE_PERIOD_DAYS} days.`,
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cancel deletion (within grace period)
export async function PUT() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.deletedAt) {
      return NextResponse.json({
        error: 'Account is not scheduled for deletion',
      }, { status: 400 });
    }

    // Check if within grace period
    const deletionRequestedAt = new Date(user.deletedAt);
    const gracePeriodEnd = new Date(deletionRequestedAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    if (new Date() > gracePeriodEnd) {
      return NextResponse.json({
        error: 'Grace period has expired. Account cannot be recovered.',
      }, { status: 410 });
    }

    // Cancel deletion: clear deletedAt
    await db.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId,
        schoolId: session.user?.schoolId ?? null,
        action: 'ACCOUNT_DELETION_CANCELLED',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({
          cancelledAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been cancelled.',
    });
  } catch (error) {
    console.error('Account deletion cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check deletion status
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.deletedAt) {
      return NextResponse.json({
        scheduledForDeletion: false,
      });
    }

    const deletionRequestedAt = new Date(user.deletedAt);
    const scheduledDeletionDate = new Date(deletionRequestedAt);
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + GRACE_PERIOD_DAYS);

    return NextResponse.json({
      scheduledForDeletion: true,
      deletionRequestedAt: deletionRequestedAt.toISOString(),
      scheduledDeletionDate: scheduledDeletionDate.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
      canCancel: new Date() < scheduledDeletionDate,
    });
  } catch (error) {
    console.error('Account deletion status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
