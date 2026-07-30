import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get a single book ──────────────────────────────────────────
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
    const book = await db.libraryBook.findUnique({
      where: { id },
      include: {
        checkouts: {
          where: { status: { in: ['active', 'overdue'] } },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { checkoutDate: 'desc' },
        },
        reservations: {
          where: { status: 'waiting' },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('LibraryBook GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update a book ──────────────────────────────────────────────
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
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.libraryBook.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'author', 'isbn', 'publisher', 'publishYear',
      'category', 'readingLevel', 'language', 'description',
      'totalCopies', 'availableCopies', 'location',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.coverGradient) updateData.coverGradient = JSON.stringify(body.coverGradient);
    if (body.tags) updateData.tags = JSON.stringify(body.tags);

    const book = await db.libraryBook.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(book);
  } catch (error) {
    console.error('LibraryBook PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Remove a book ──────────────────────────────────────────
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

    // Check for active checkouts
    const activeCheckouts = await db.bookCheckout.count({
      where: { bookId: id, status: { in: ['active', 'overdue'] } },
    });

    if (activeCheckouts > 0) {
      return NextResponse.json(
        { error: 'Cannot delete book with active checkouts' },
        { status: 400 }
      );
    }

    await db.libraryBook.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LibraryBook DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
