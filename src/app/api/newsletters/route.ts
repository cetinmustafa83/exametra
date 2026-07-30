import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/newsletters — list newsletters with extended filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const published = searchParams.get('published');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const templateType = searchParams.get('templateType');
    const authorId = searchParams.get('authorId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (published === 'true') {
      where.isPublished = true;
    } else if (published === 'false') {
      where.isPublished = false;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    const [newsletters, total] = await Promise.all([
      db.newsletter.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.newsletter.count({ where }),
    ]);

    return NextResponse.json({ newsletters, total });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletters' }, { status: 500 });
  }
}

// POST /api/newsletters — create newsletter with extended fields
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId, authorId, title, subject, content, summary, imageUrl,
      bannerImageUrl, category, templateType, targetAudience, status,
      tags, scheduledAt, isDemo,
    } = body;

    if (!schoolId || !authorId || !title || !content) {
      return NextResponse.json(
        { error: 'schoolId, authorId, title, content required' },
        { status: 400 }
      );
    }

    const newsletter = await db.newsletter.create({
      data: {
        schoolId,
        authorId,
        title,
        subject: subject || null,
        content,
        summary: summary || null,
        imageUrl: imageUrl || null,
        bannerImageUrl: bannerImageUrl || null,
        category: category || 'general',
        templateType: templateType || 'monthly',
        targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
        status: status || 'draft',
        tags: tags ? JSON.stringify(tags) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isDemo: isDemo || false,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(newsletter, { status: 201 });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 });
  }
}
