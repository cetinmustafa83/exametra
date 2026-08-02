import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';

// ── GET: List checkouts ──────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const bookId = searchParams.get('bookId');
    const overdue = searchParams.get('overdue') === 'true';
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }
    if (session.user?.role !== 'SUPER_ADMIN' && schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentId && (!session.user || !(await canAccessStudent(session.user, studentId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (bookId) where.bookId = bookId;

    if (overdue) {
      where.status = 'active';
      where.dueDate = { lt: new Date() };
    }

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

    const [checkouts, total] = await Promise.all([
      db.bookCheckout.findMany({
        where,
        include: {
          book: { select: { id: true, title: true, author: true, category: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
          checkedOutByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { checkoutDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.bookCheckout.count({ where }),
    ]);

    // Mark overdue checkouts
    const now = new Date();
    const enriched = checkouts.map((checkout) => {
      const isOverdue = checkout.status === 'active' && new Date(checkout.dueDate) < now;
      const daysOverdue = isOverdue
        ? Math.floor((now.getTime() - new Date(checkout.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        ...checkout,
        isOverdue,
        daysOverdue,
      };
    });

    // Auto-update overdue status in the background
    if (status === 'active' || !status) {
      const overdueIds = enriched
        .filter((c) => c.isOverdue && c.status === 'active')
        .map((c) => c.id);

      if (overdueIds.length > 0) {
        await db.bookCheckout.updateMany({
          where: { id: { in: overdueIds } },
          data: { status: 'overdue' },
        });
      }
    }

    return NextResponse.json({ checkouts: enriched, total });
  } catch (error) {
    console.error('BookCheckouts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Checkout a book ──────────────────────────────────────────
export async function POST(request: Request) {
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

    const body = await request.json();
    const { bookId, studentId, schoolId, dueDate, condition, notes } = body;

    if (!bookId || !studentId || !schoolId) {
      return NextResponse.json(
        { error: 'bookId, studentId, and schoolId are required' },
        { status: 400 }
      );
    }
    if (session.user?.role !== 'SUPER_ADMIN' && schoolId !== session.user?.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check book availability
    const book = await db.libraryBook.findUnique({ where: { id: bookId } });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (book.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Book not found in this school' }, { status: 404 });
    }

    if (book.availableCopies <= 0) {
      return NextResponse.json({ error: 'No copies available' }, { status: 400 });
    }

    // Check if student already has this book checked out
    const existingCheckout = await db.bookCheckout.findFirst({
      where: {
        bookId,
        studentId,
        status: { in: ['active', 'overdue'] },
      },
    });

    if (existingCheckout) {
      return NextResponse.json(
        { error: 'Student already has this book checked out' },
        { status: 400 }
      );
    }

    // Calculate due date (default 14 days from now)
    const checkoutDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const checkout = await db.bookCheckout.create({
      data: {
        schoolId,
        bookId,
        studentId,
        checkedOutBy: session.userId,
        dueDate: checkoutDueDate,
        condition: condition || 'good',
        notes: notes || null,
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        checkedOutByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Decrease available copies
    await db.libraryBook.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: 1 } },
    });

    return NextResponse.json(checkout, { status: 201 });
  } catch (error) {
    console.error('BookCheckout POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
