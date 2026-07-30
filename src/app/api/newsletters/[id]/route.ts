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

// PUT /api/newsletters/[id] — update newsletter with extended fields
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
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.content !== undefined) data.content = body.content;
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.bannerImageUrl !== undefined) data.bannerImageUrl = body.bannerImageUrl;
    if (body.category !== undefined) data.category = body.category;
    if (body.templateType !== undefined) data.templateType = body.templateType;
    if (body.targetAudience !== undefined) data.targetAudience = JSON.stringify(body.targetAudience);
    if (body.status !== undefined) data.status = body.status;
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.openCount !== undefined) data.openCount = body.openCount;
    if (body.clickCount !== undefined) data.clickCount = body.clickCount;
    if (body.bounceCount !== undefined) data.bounceCount = body.bounceCount;
    if (body.totalRecipients !== undefined) data.totalRecipients = body.totalRecipients;

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

// POST /api/newsletters/[id] — publish/unpublish/archive/duplicate newsletter
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

    // Duplicate action
    if (body.action === 'duplicate') {
      const duplicated = await db.newsletter.create({
        data: {
          schoolId: existing.schoolId,
          authorId: body.authorId || existing.authorId,
          title: existing.title + ' (Kopie)',
          subject: existing.subject,
          content: existing.content,
          summary: existing.summary,
          imageUrl: existing.imageUrl,
          bannerImageUrl: existing.bannerImageUrl,
          category: existing.category,
          templateType: existing.templateType,
          targetAudience: existing.targetAudience,
          status: 'draft',
          tags: existing.tags,
          isDemo: existing.isDemo,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(duplicated, { status: 201 });
    }

    // Archive action
    if (body.action === 'archive') {
      const newsletter = await db.newsletter.update({
        where: { id },
        data: { status: 'archived' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(newsletter);
    }

    // Publish/unpublish
    const isPublished = body.action === 'publish' ? true : body.action === 'unpublish' ? false : !existing.isPublished;

    const newsletter = await db.newsletter.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        status: isPublished ? 'sent' : 'draft',
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
