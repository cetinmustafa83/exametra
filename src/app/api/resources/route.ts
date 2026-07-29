import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const resourceTypeEnum = z.enum([
  'document', 'worksheet', 'presentation', 'video_link', 'image', 'link', 'audio',
]);

const createResourceSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  resourceType: resourceTypeEnum,
  url: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classGroupId: z.string().optional().nullable(),
  gradeLevel: z.number().int().min(1).max(13).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const resourceType = searchParams.get('resourceType');
    const subjectId = searchParams.get('subjectId');
    const classGroupId = searchParams.get('classGroupId');
    const search = searchParams.get('search');
    const isPublic = searchParams.get('isPublic');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId, deletedAt: null };

    // Students can only see public resources
    if (session.user?.role === 'STUDENT') {
      where.isPublic = true;
    }

    if (resourceType && resourceType !== 'all') where.resourceType = resourceType;
    if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
    if (classGroupId && classGroupId !== 'all') where.classGroupId = classGroupId;
    if (isPublic === 'true') where.isPublic = true;
    if (isPublic === 'false') where.isPublic = false;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const resources = await db.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Resources GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, subjectId, classGroupId, tags, ...rest } = parsed.data;

    // Verify school
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify subject if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    // Verify classGroup if provided
    if (classGroupId) {
      const classGroup = await db.classGroup.findUnique({ where: { id: classGroupId } });
      if (!classGroup || classGroup.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
      }
    }

    const resource = await db.resource.create({
      data: {
        schoolId,
        authorId: session.userId,
        title: rest.title,
        description: rest.description ?? null,
        resourceType: rest.resourceType,
        url: rest.url ?? null,
        content: rest.content ?? null,
        subjectId: subjectId || null,
        classGroupId: classGroupId || null,
        gradeLevel: rest.gradeLevel ?? null,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: rest.isPublic,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Resources POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
