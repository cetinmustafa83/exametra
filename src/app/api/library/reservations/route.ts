import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: List reservations ──────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const bookId = searchParams.get('bookId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (bookId) where.bookId = bookId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    // Role-based filtering
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (student) {
        where.studentId = student.id;
      }
    } else if (session.user?.role === 'PARENT') {
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: session.userId },
        select: { studentId: true },
      });
      const studentIds = parentLinks.map((l) => l.studentId);
      where.studentId = { in: studentIds };
    }

    const reservations = await db.bookReservation.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, author: true, availableCopies: true, totalCopies: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('BookReservations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Reserve a book ──────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { bookId, studentId, schoolId } = body;

    if (!bookId || !studentId || !schoolId) {
      return NextResponse.json(
        { error: 'bookId, studentId, and schoolId are required' },
        { status: 400 }
      );
    }

    // Check book exists
    const book = await db.libraryBook.findUnique({ where: { id: bookId } });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check if already reserved
    const existingReservation = await db.bookReservation.findFirst({
      where: {
        bookId,
        studentId,
        status: { in: ['waiting', 'notified'] },
      },
    });

    if (existingReservation) {
      return NextResponse.json(
        { error: 'Already reserved this book' },
        { status: 400 }
      );
    }

    // Calculate queue position
    const maxPosition = await db.bookReservation.findFirst({
      where: { bookId, status: 'waiting' },
      orderBy: { queuePosition: 'desc' },
      select: { queuePosition: true },
    });

    const queuePosition = (maxPosition?.queuePosition ?? 0) + 1;

    const reservation = await db.bookReservation.create({
      data: {
        schoolId,
        bookId,
        studentId,
        userId: session.userId,
        queuePosition,
        status: 'waiting',
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error('BookReservation POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
