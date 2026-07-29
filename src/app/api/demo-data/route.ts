import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get demo data statistics ──
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only SCHOOL_ADMIN or SUPER_ADMIN can view demo data stats
    if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get demo user IDs for cascade counting
    const demoUsers = await db.user.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    const demoUserIds = demoUsers.map((u) => u.id);

    const [
      demoUserCount,
      demoNotebookCount,
      demoDrawingCount,
      cascadeNotebookCount,
      cascadeDrawingCount,
    ] = await Promise.all([
      db.user.count({ where: { isDemo: true } }),
      db.notebook.count({ where: { isDemo: true } }),
      db.drawing.count({ where: { isDemo: true } }),
      demoUserIds.length > 0
        ? db.notebook.count({
            where: { ownerId: { in: demoUserIds }, isDemo: false },
          })
        : 0,
      demoUserIds.length > 0
        ? db.drawing.count({
            where: { ownerId: { in: demoUserIds }, isDemo: false },
          })
        : 0,
    ]);

    return NextResponse.json({
      User: demoUserCount,
      Notebook: demoNotebookCount,
      Drawing: demoDrawingCount,
      _cascadeNotebooks: cascadeNotebookCount,
      _cascadeDrawings: cascadeDrawingCount,
      _total:
        demoUserCount +
        demoNotebookCount +
        demoDrawingCount +
        cascadeNotebookCount +
        cascadeDrawingCount,
    });
  } catch (error) {
    console.error('Demo data stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── DELETE: Delete ALL demo data ──
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only SCHOOL_ADMIN or SUPER_ADMIN can delete demo data
    if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const summary: Record<string, number> = {};

    // 1. Get all demo user IDs for cascade deletion
    const demoUsers = await db.user.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    const demoUserIds = demoUsers.map((u) => u.id);

    // 2. Delete NotebookPages for notebooks owned by demo users
    // (NotebookPage has cascade delete on Notebook, but we need to handle
    //  notebooks where isDemo=true OR ownerId is a demo user)
    const demoNotebookIds = await db.notebook.findMany({
      where: {
        OR: [{ isDemo: true }, { ownerId: { in: demoUserIds } }],
      },
      select: { id: true },
    });
    const demoNotebookIdList = demoNotebookIds.map((n) => n.id);

    let deletedPages = 0;
    if (demoNotebookIdList.length > 0) {
      deletedPages = (await db.notebookPage.deleteMany({
        where: { notebookId: { in: demoNotebookIdList } },
      })) as unknown as number;
      summary.NotebookPage = typeof deletedPages === 'number' ? deletedPages : (deletedPages as { count: number }).count ?? 0;
    } else {
      summary.NotebookPage = 0;
    }

    // 3. Delete notebooks where isDemo=true OR ownerId is a demo user
    const deletedNotebooks = await db.notebook.deleteMany({
      where: {
        OR: [{ isDemo: true }, { ownerId: { in: demoUserIds } }],
      },
    });
    summary.Notebook =
      typeof deletedNotebooks === 'number'
        ? deletedNotebooks
        : (deletedNotebooks as { count: number }).count ?? 0;

    // 4. Delete drawings where isDemo=true OR ownerId is a demo user
    const deletedDrawings = await db.drawing.deleteMany({
      where: {
        OR: [{ isDemo: true }, { ownerId: { in: demoUserIds } }],
      },
    });
    summary.Drawing =
      typeof deletedDrawings === 'number'
        ? deletedDrawings
        : (deletedDrawings as { count: number }).count ?? 0;

    // 5. Delete demo users (soft-deleted users that are demo)
    const deletedUsers = await db.user.deleteMany({
      where: { isDemo: true },
    });
    summary.User =
      typeof deletedUsers === 'number'
        ? deletedUsers
        : (deletedUsers as { count: number }).count ?? 0;

    // 6. Log the cleanup in AuditLog
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: session.user.schoolId,
        action: 'DEMO_DATA_CLEANUP',
        entityType: 'System',
        metadata: JSON.stringify(summary),
      },
    });

    return NextResponse.json({
      message: 'Demo data cleanup completed',
      deleted: summary,
    });
  } catch (error) {
    console.error('Demo data cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
