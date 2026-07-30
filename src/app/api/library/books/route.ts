import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List/search books ──────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const readingLevel = searchParams.get('readingLevel');
    const availability = searchParams.get('availability'); // all, available, checked_out
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (readingLevel) where.readingLevel = readingLevel;

    if (availability === 'available') {
      where.availableCopies = { gt: 0 };
    } else if (availability === 'checked_out') {
      where.availableCopies = 0;
    }

    const [books, total] = await Promise.all([
      db.libraryBook.findMany({
        where,
        include: {
          _count: { select: { checkouts: true, reservations: true } },
        },
        orderBy: { title: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.libraryBook.count({ where }),
    ]);

    // Get active checkouts count per book
    const activeCheckouts = await db.bookCheckout.groupBy({
      by: ['bookId'],
      where: { schoolId, status: 'active' },
      _count: { id: true },
    });

    const activeCheckoutMap = Object.fromEntries(
      activeCheckouts.map((c) => [c.bookId, c._count.id])
    );

    // Get waiting reservations count per book
    const waitingReservations = await db.bookReservation.groupBy({
      by: ['bookId'],
      where: { schoolId, status: 'waiting' },
      _count: { id: true },
    });

    const waitingReservationMap = Object.fromEntries(
      waitingReservations.map((r) => [r.bookId, r._count.id])
    );

    const enriched = books.map((book) => ({
      ...book,
      activeCheckouts: activeCheckoutMap[book.id] || 0,
      waitingReservations: waitingReservationMap[book.id] || 0,
      isAvailable: book.availableCopies > 0,
    }));

    return NextResponse.json({ books: enriched, total });
  } catch (error) {
    console.error('LibraryBooks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Add a new book ──────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN' &&
      userRole !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      author,
      isbn,
      publisher,
      publishYear,
      category,
      readingLevel,
      language,
      description,
      coverGradient,
      totalCopies,
      location,
      tags,
      schoolId,
    } = body;

    if (!title || !author || !schoolId || !category) {
      return NextResponse.json(
        { error: 'title, author, schoolId, and category are required' },
        { status: 400 }
      );
    }

    const book = await db.libraryBook.create({
      data: {
        schoolId,
        title,
        author,
        isbn: isbn || null,
        publisher: publisher || null,
        publishYear: publishYear || null,
        category,
        readingLevel: readingLevel || null,
        language: language || 'de',
        description: description || null,
        coverGradient: coverGradient ? JSON.stringify(coverGradient) : null,
        totalCopies: totalCopies ?? 1,
        availableCopies: totalCopies ?? 1,
        location: location || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error('LibraryBooks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
