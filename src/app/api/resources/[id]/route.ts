import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const resourceTypeEnum = z.enum([
  'document', 'worksheet', 'presentation', 'video_link', 'image', 'link', 'audio',
]);

const updateResourceSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  resourceType: resourceTypeEnum.optional(),
  url: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classGroupId: z.string().optional().nullable(),
  gradeLevel: z.number().int().min(1).max(13).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isPublic: z.boolean().optional(),
  incrementDownload: z.boolean().optional(),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const resource = await db.resource.findUnique({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Students can only see public resources
    if (session.user?.role === 'STUDENT' && !resource.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('Resources GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.resource.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Only the author or admins can edit
    if (session.user?.role === 'TEACHER' && existing.authorId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle download increment separately
    if (parsed.data.incrementDownload) {
      await db.resource.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.resourceType !== undefined) updateData.resourceType = parsed.data.resourceType;
    if (parsed.data.url !== undefined) updateData.url = parsed.data.url;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.subjectId !== undefined) updateData.subjectId = parsed.data.subjectId || null;
    if (parsed.data.classGroupId !== undefined) updateData.classGroupId = parsed.data.classGroupId || null;
    if (parsed.data.gradeLevel !== undefined) updateData.gradeLevel = parsed.data.gradeLevel;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags ? JSON.stringify(parsed.data.tags) : null;
    if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;

    const resource = await db.resource.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error('Resources PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.resource.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Only the author or admins can delete
    if (session.user?.role === 'TEACHER' && existing.authorId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resources DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
