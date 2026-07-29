import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── POST: Duplicate a notebook (create a new copy with all pages) ──
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Find the source notebook
    const source = await db.notebook.findUnique({
      where: { id, deletedAt: null },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    // Access check: owner or public notebook in the same school
    if (
      source.ownerId !== session.user.id &&
      !(source.isPublic && source.schoolId === session.user.schoolId)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get locale to determine copy suffix
    const locale = session.user.locale ?? 'de';
    const copySuffix = locale === 'en' ? ' (Copy)' : ' (Kopie)';

    // Create the duplicated notebook
    const duplicated = await db.notebook.create({
      data: {
        schoolId: source.schoolId,
        ownerId: session.user.id,
        ownerType: 'TEACHER',
        subjectId: source.subjectId,
        classGroupId: source.classGroupId,
        title: source.title + copySuffix,
        description: source.description,
        notebookType: source.notebookType,
        color: source.color,
        icon: source.icon,
        isArchived: false,
        isPublic: false, // duplicated notebooks start as private
        sortOrder: 0,
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    // Create all pages from the source notebook
    for (const page of source.pages) {
      await db.notebookPage.create({
        data: {
          notebookId: duplicated.id,
          pageNumber: page.pageNumber,
          title: page.title,
          contentType: page.contentType,
          textContent: page.textContent,
          drawingData: page.drawingData,
          background: page.background,
          isBookmark: page.isBookmark,
        },
      });
    }

    // Fetch the duplicated notebook again with updated _count
    const result = await db.notebook.findUnique({
      where: { id: duplicated.id },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: source.schoolId,
        action: 'CREATE',
        entityType: 'Notebook',
        entityId: duplicated.id,
        metadata: JSON.stringify({
          duplicatedFrom: id,
          title: duplicated.title,
        }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Notebook duplicate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
