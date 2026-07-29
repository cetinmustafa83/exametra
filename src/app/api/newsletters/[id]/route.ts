import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/newsletters/[id] — get single newsletter
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsletter = await db.newsletter.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!newsletter || newsletter.deletedAt) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletter' }, { status: 500 });
  }
}

// PUT /api/newsletters/[id] — update newsletter
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.newsletter.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.category !== undefined) data.category = body.category;
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);

    const newsletter = await db.newsletter.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error updating newsletter:', error);
    return NextResponse.json({ error: 'Failed to update newsletter' }, { status: 500 });
  }
}

// POST /api/newsletters/[id] — publish/unpublish newsletter
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.newsletter.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const isPublished = body.action === 'publish' ? true : body.action === 'unpublish' ? false : !existing.isPublished;

    const newsletter = await db.newsletter.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error toggling newsletter publish:', error);
    return NextResponse.json({ error: 'Failed to toggle newsletter' }, { status: 500 });
  }
}

// DELETE /api/newsletters/[id] — soft delete newsletter
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.newsletter.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    await db.newsletter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    return NextResponse.json({ error: 'Failed to delete newsletter' }, { status: 500 });
  }
}
