import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sections: z.string().default('[]'),
  gradingScale: z.string().default('{}'),
  layout: z.enum(['default', 'detailed', 'compact']).default('default'),
  isDefault: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const templates = await db.reportCardTemplate.findMany({
      where: { schoolId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('ReportCardTemplates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schoolId = session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (parsed.data.isDefault) {
      await db.reportCardTemplate.updateMany({
        where: { schoolId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await db.reportCardTemplate.create({
      data: {
        schoolId,
        name: parsed.data.name,
        description: parsed.data.description,
        sections: parsed.data.sections,
        gradingScale: parsed.data.gradingScale,
        layout: parsed.data.layout,
        isDefault: parsed.data.isDefault,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('ReportCardTemplates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
