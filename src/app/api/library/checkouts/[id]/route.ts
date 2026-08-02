import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

// ── PUT: Return a book (or renew) ──────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, returnCondition, notes, fineAmount } = body;

    const checkout = await db.bookCheckout.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && checkout.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, checkout.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'return') {
      // Return the book
      const updated = await db.bookCheckout.update({
        where: { id },
        data: {
          status: 'returned',
          returnDate: new Date(),
          returnCondition: returnCondition || checkout.condition,
          notes: notes || checkout.notes,
          fineAmount: fineAmount ?? checkout.fineAmount,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Increase available copies
      await db.libraryBook.update({
        where: { id: checkout.bookId },
        data: { availableCopies: { increment: 1 } },
      });

      // Check if there are waiting reservations to notify
      const nextReservation = await db.bookReservation.findFirst({
        where: { bookId: checkout.bookId, status: 'waiting' },
        orderBy: { createdAt: 'asc' },
      });

      if (nextReservation) {
        await db.bookReservation.update({
          where: { id: nextReservation.id },
          data: { status: 'notified', notifiedAt: new Date() },
        });
      }

      return NextResponse.json(updated);
    } else if (action === 'renew') {
      // Renew the checkout (extend due date by 14 days)
      if (checkout.status === 'returned' || checkout.status === 'lost') {
        return NextResponse.json(
          { error: 'Cannot renew a returned or lost checkout' },
          { status: 400 }
        );
      }

      if (checkout.renewalCount >= 3) {
        return NextResponse.json(
          { error: 'Maximum renewals reached (3)' },
          { status: 400 }
        );
      }

      const newDueDate = new Date(checkout.dueDate);
      newDueDate.setDate(newDueDate.getDate() + 14);

      const updated = await db.bookCheckout.update({
        where: { id },
        data: {
          dueDate: newDueDate,
          renewalCount: { increment: 1 },
          status: 'active',
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return NextResponse.json(updated);
    } else if (action === 'mark_overdue') {
      const updated = await db.bookCheckout.update({
        where: { id },
        data: { status: 'overdue' },
      });
      return NextResponse.json(updated);
    } else if (action === 'mark_lost') {
      const updated = await db.bookCheckout.update({
        where: { id },
        data: { status: 'lost' },
      });
      // Decrease total copies
      await db.libraryBook.update({
        where: { id: checkout.bookId },
        data: { totalCopies: { decrement: 1 } },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('BookCheckout PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Remove a checkout record ──────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const checkout = await db.bookCheckout.findUnique({ where: { id } });
    if (!checkout) return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
    if (session.user?.role !== 'SUPER_ADMIN' && checkout.schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, checkout.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await db.bookCheckout.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BookCheckout DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
