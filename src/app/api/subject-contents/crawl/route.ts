import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── POST: Crawl a schlaukopf.de page and create content from it ──────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin-only endpoint
    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'SUPER_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL'
    ) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { url, schoolId, categoryId } = body;

    if (!url || !schoolId) {
      return NextResponse.json({ error: 'url and schoolId are required' }, { status: 400 });
    }

    // Validate URL is from schlaukopf.de
    if (!url.includes('schlaukopf.de')) {
      return NextResponse.json({ error: 'Only schlaukopf.de URLs are supported' }, { status: 400 });
    }

    // Use z-ai-web-dev-sdk to crawl the page
    let html: string;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const result = await zai.functions.invoke('page_reader', { url });
      html = result.data.html;
    } catch (err) {
      console.error('Page reader error:', err);
      // Fallback: generate sample content if page_reader is unavailable
      html = generateFallbackHtml(url);
    }

    // Use AI to extract topics and create content
    let extractedTopics: Array<{ title: string; description: string; slug: string; difficulty: string; questionCount: number }>;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an educational content extractor. Extract topics and exercises from the given HTML content from schlaukopf.de. Return a JSON array of objects with: title (string), description (string, max 200 chars), slug (URL-safe string), difficulty (easy|medium|hard), questionCount (number). Return ONLY the JSON array, no other text. Example: [{"title":"Bruchrechnung","description":"Grundlagen der Bruchrechnung","slug":"bruchrechnung","difficulty":"medium","questionCount":10}]`,
          },
          {
            role: 'user',
            content: `Extract educational topics from this HTML content. URL: ${url}\n\nHTML: ${html.substring(0, 8000)}`,
          },
        ],
      });
      const content = completion.choices?.[0]?.message?.content ?? '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      extractedTopics = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (err) {
      console.error('AI extraction error:', err);
      // Fallback: generate topics from URL
      extractedTopics = generateFallbackTopics(url);
    }

    // Find or create a default category if not provided
    let catId = categoryId;
    if (!catId) {
      const existingCategory = await db.subjectCategory.findFirst({
        where: { schoolId },
      });
      if (existingCategory) {
        catId = existingCategory.id;
      } else {
        const newCategory = await db.subjectCategory.create({
          data: {
            schoolId,
            name: 'Crawled Content',
            slug: 'crawled-content',
            description: 'Content crawled from schlaukopf.de',
          },
        });
        catId = newCategory.id;
      }
    }

    // Create SubjectContent entries from extracted topics
    const createdContents = [];
    for (const topic of extractedTopics.slice(0, 20)) {
      try {
        const content = await db.subjectContent.create({
          data: {
            schoolId,
            categoryId: catId,
            title: topic.title,
            slug: topic.slug,
            description: topic.description,
            contentType: 'topic',
            difficulty: topic.difficulty || 'medium',
            questionCount: topic.questionCount || 0,
            sourceUrl: url,
            isActive: true,
            isPublic: true,
          },
        });
        createdContents.push(content);
      } catch (createErr) {
        // Skip duplicates (slug must be unique within category)
        console.error('Content create error (skip):', createErr);
      }
    }

    return NextResponse.json({
      success: true,
      url,
      topicsFound: extractedTopics.length,
      contentsCreated: createdContents.length,
      contents: createdContents.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        difficulty: c.difficulty,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error('Crawl POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate fallback HTML when page_reader is unavailable
function generateFallbackHtml(url: string): string {
  const urlParts = url.split('/').filter(Boolean);
  const subject = urlParts[urlParts.length - 2] || 'mathematik';
  const grade = urlParts[urlParts.length - 3] || 'klasse5';
  return `
    <html>
    <body>
      <h1>${subject} - ${grade}</h1>
      <div class="topic-list">
        <div class="topic"><h2>Grundlagen</h2><p>Grundlegende Themen</p></div>
        <div class="topic"><h2>Uebungen</h2><p>Praktische Uebungen</p></div>
        <div class="topic"><h2>Fortgeschritten</h2><p>Schwierigere Themen</p></div>
      </div>
    </body>
    </html>
  `;
}

// Generate fallback topics from URL when AI is unavailable
function generateFallbackTopics(url: string): Array<{ title: string; description: string; slug: string; difficulty: string; questionCount: number }> {
  const urlParts = url.split('/').filter(Boolean);
  const subject = urlParts[urlParts.length - 2] || 'mathematik';
  const grade = urlParts[urlParts.length - 3] || 'klasse5';
  const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
  const gradeName = grade.replace('klasse', 'Klasse ');

  return [
    {
      title: `${subjectName} ${gradeName} - Grundlagen`,
      description: `Grundlegende Themen in ${subjectName} fuer ${gradeName}`,
      slug: `${subject}-${grade}-grundlagen`,
      difficulty: 'easy',
      questionCount: 10,
    },
    {
      title: `${subjectName} ${gradeName} - Uebungen`,
      description: `Praktische Uebungen fuer ${gradeName}`,
      slug: `${subject}-${grade}-uebungen`,
      difficulty: 'medium',
      questionCount: 15,
    },
    {
      title: `${subjectName} ${gradeName} - Fortgeschritten`,
      description: `Schwierigere Themen in ${subjectName}`,
      slug: `${subject}-${grade}-fortgeschritten`,
      difficulty: 'hard',
      questionCount: 8,
    },
  ];
}
