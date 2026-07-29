import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Library statistics ──────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const now = new Date();

    // Basic counts
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      activeCheckouts,
      overdueCheckouts,
      totalCheckouts,
      totalReservations,
      waitingReservations,
    ] = await Promise.all([
      db.libraryBook.count({ where: { schoolId } }),
      db.libraryBook.aggregate({ where: { schoolId }, _sum: { totalCopies: true } }),
      db.libraryBook.aggregate({ where: { schoolId }, _sum: { availableCopies: true } }),
      db.bookCheckout.count({ where: { schoolId, status: 'active' } }),
      db.bookCheckout.count({ where: { schoolId, status: 'overdue' } }),
      db.bookCheckout.count({ where: { schoolId } }),
      db.bookReservation.count({ where: { schoolId } }),
      db.bookReservation.count({ where: { schoolId, status: 'waiting' } }),
    ]);

    // Overdue rate
    const overdueRate = totalCheckouts > 0
      ? Math.round((overdueCheckouts / totalCheckouts) * 100)
      : 0;

    // Most popular books (by checkout count)
    const popularBooks = await db.bookCheckout.groupBy({
      by: ['bookId'],
      where: { schoolId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const popularBookIds = popularBooks.map((b) => b.bookId);
    const popularBookDetails = await db.libraryBook.findMany({
      where: { id: { in: popularBookIds } },
      select: { id: true, title: true, author: true, category: true },
    });

    const popularBookMap = Object.fromEntries(
      popularBookDetails.map((b) => [b.id, b])
    );

    const popularBooksWithCount = popularBooks.map((b) => ({
      ...popularBookMap[b.bookId],
      checkoutCount: b._count.id,
    }));

    // Category distribution
    const categoryDistribution = await db.libraryBook.groupBy({
      by: ['category'],
      where: { schoolId },
      _count: { id: true },
    });

    // Checkout trends (last 30 days, by day)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCheckouts = await db.bookCheckout.findMany({
      where: {
        schoolId,
        checkoutDate: { gte: thirtyDaysAgo },
      },
      select: { checkoutDate: true },
    });

    // Group by day
    const checkoutTrends: Record<string, number> = {};
    for (const checkout of recentCheckouts) {
      const dateKey = new Date(checkout.checkoutDate).toISOString().split('T')[0];
      checkoutTrends[dateKey] = (checkoutTrends[dateKey] || 0) + 1;
    }

    const trendData = Object.entries(checkoutTrends)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Overdue checkouts list
    const overdueList = await db.bookCheckout.findMany({
      where: { schoolId, status: 'overdue' },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    const overdueWithDays = overdueList.map((checkout) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(checkout.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ...checkout, daysOverdue };
    });

    return NextResponse.json({
      totalBooks,
      totalCopies: totalCopies._sum.totalCopies || 0,
      availableCopies: availableCopies._sum.availableCopies || 0,
      checkedOut: activeCheckouts,
      overdue: overdueCheckouts,
      totalCheckouts,
      totalReservations,
      waitingReservations,
      overdueRate,
      popularBooks: popularBooksWithCount,
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      checkoutTrends: trendData,
      overdueList: overdueWithDays,
    });
  } catch (error) {
    console.error('LibraryStats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
