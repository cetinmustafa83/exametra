import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const MAX_VERSIONS_PER_PAGE = 50;

// ── GET: List all versions of a page ──
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, pageId } = await params;

    const page = await db.notebookPage.findUnique({
      where: { id: pageId },
      include: { notebook: true },
    });

    if (!page || page.notebookId !== id) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const versions = await db.notebookPageVersion.findMany({
      where: { pageId },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Page versions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create a new version (auto-called when page is saved) ──
const createVersionSchema = z.object({
  editSummary: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, pageId } = await params;

    const page = await db.notebookPage.findUnique({
      where: { id: pageId },
      include: { notebook: true },
    });

    if (!page || page.notebookId !== id) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.notebook.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Get current max version number
    const latestVersion = await db.notebookPageVersion.findFirst({
      where: { pageId },
      orderBy: { version: 'desc' },
    });

    const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Create the version with current page content
    const version = await db.notebookPageVersion.create({
      data: {
        pageId,
        version: versionNumber,
        textContent: page.textContent,
        drawingData: page.drawingData,
        editedBy: session.user.id,
        editSummary: parsed.data.editSummary ?? null,
      },
    });

    // Enforce max 50 versions: delete older ones
    const allVersions = await db.notebookPageVersion.findMany({
      where: { pageId },
      orderBy: { version: 'asc' },
    });

    if (allVersions.length > MAX_VERSIONS_PER_PAGE) {
      const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS_PER_PAGE);
      await db.notebookPageVersion.deleteMany({
        where: {
          id: { in: toDelete.map(v => v.id) },
        },
      });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Page version POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Restore a specific version (creates a new version from old content) ──
const restoreVersionSchema = z.object({
  versionId: z.string(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, pageId } = await params;

    const page = await db.notebookPage.findUnique({
      where: { id: pageId },
      include: { notebook: true },
    });

    if (!page || page.notebookId !== id) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.notebook.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = restoreVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Find the version to restore
    const oldVersion = await db.notebookPageVersion.findUnique({
      where: { id: parsed.data.versionId },
    });

    if (!oldVersion || oldVersion.pageId !== pageId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // First, create a version of current content before restoring
    const latestVersion = await db.notebookPageVersion.findFirst({
      where: { pageId },
      orderBy: { version: 'desc' },
    });

    const preRestoreVersion = latestVersion ? latestVersion.version + 1 : 1;

    await db.notebookPageVersion.create({
      data: {
        pageId,
        version: preRestoreVersion,
        textContent: page.textContent,
        drawingData: page.drawingData,
        editedBy: session.user.id,
        editSummary: `Pre-restore snapshot (before restoring v${oldVersion.version})`,
      },
    });

    // Restore the old content to the page
    const updatedPage = await db.notebookPage.update({
      where: { id: pageId },
      data: {
        textContent: oldVersion.textContent,
        drawingData: oldVersion.drawingData,
      },
    });

    // Create the restored version entry
    const restoredVersionNumber = preRestoreVersion + 1;
    const restoredVersion = await db.notebookPageVersion.create({
      data: {
        pageId,
        version: restoredVersionNumber,
        textContent: oldVersion.textContent,
        drawingData: oldVersion.drawingData,
        editedBy: session.user.id,
        editSummary: `Restored from v${oldVersion.version}`,
      },
    });

    // Enforce max versions
    const allVersions = await db.notebookPageVersion.findMany({
      where: { pageId },
      orderBy: { version: 'asc' },
    });
    if (allVersions.length > MAX_VERSIONS_PER_PAGE) {
      const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS_PER_PAGE);
      await db.notebookPageVersion.deleteMany({
        where: { id: { in: toDelete.map(v => v.id) } },
      });
    }

    return NextResponse.json({
      page: updatedPage,
      restoredVersion,
    });
  } catch (error) {
    console.error('Page version restore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
