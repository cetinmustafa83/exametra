import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── DELETE: Cancel a reservation ──────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const reservation = await db.bookReservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Only the user who made the reservation, or admin, can cancel
    const userRole = session.user?.role;
    const isOwner = reservation.userId === session.userId;
    const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'VICE_PRINCIPAL' || userRole === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.bookReservation.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // Re-calculate queue positions for remaining reservations
    const remaining = await db.bookReservation.findMany({
      where: { bookId: reservation.bookId, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
    });

    await Promise.all(
      remaining.map((r, index) =>
        db.bookReservation.update({
          where: { id: r.id },
          data: { queuePosition: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BookReservation DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
