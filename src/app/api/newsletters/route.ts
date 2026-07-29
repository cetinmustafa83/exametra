import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/newsletters — list newsletters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const published = searchParams.get('published');
    const category = searchParams.get('category');
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

// POST /api/newsletters — create newsletter
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, authorId, title, content, summary, imageUrl, category, tags, isDemo } = body;

    if (!schoolId || !authorId || !title || !content) {
      return NextResponse.json({ error: 'schoolId, authorId, title, content required' }, { status: 400 });
    }

    const newsletter = await db.newsletter.create({
      data: {
        schoolId,
        authorId,
        title,
        content,
        summary: summary || null,
        imageUrl: imageUrl || null,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags) : null,
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
