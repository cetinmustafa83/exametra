import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const entryType = searchParams.get('entryType');
    const competencyId = searchParams.get('competencyId');
    const isPublic = searchParams.get('isPublic');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (studentId && (!session.user || !(await canAccessStudent(session.user, studentId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (studentId) where.studentId = studentId;
    if (!studentId && !isAdministrator(session.user?.role)) {
      if (session.user?.role === 'STUDENT') {
        const student = await db.student.findFirst({ where: { userId: session.user.id }, select: { id: true } });
        if (!student) return NextResponse.json([]);
        where.studentId = student.id;
      } else if (session.user?.role === 'PARENT') {
        const links = await db.parentStudentLink.findMany({ where: { parentId: session.user.id }, select: { studentId: true } });
        where.studentId = { in: links.map((link) => link.studentId) };
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (entryType) where.entryType = entryType;
    if (competencyId) where.competencyId = competencyId;
    if (isPublic !== null && isPublic !== undefined) where.isPublic = isPublic === 'true';

    const entries = await db.portfolioEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('PortfolioEntry GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      studentId,
      title,
      description,
      entryType,
      competencyId,
      content,
      mediaUrls,
      notebookPageId,
      drawingId,
      isPublic,
      tags,
      isDemo,
    } = body;

    if (!schoolId || !studentId || !title || !entryType) {
      return NextResponse.json(
        { error: 'schoolId, studentId, title, and entryType are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await db.portfolioEntry.create({
      data: {
        schoolId,
        studentId,
        title,
        description: description || null,
        entryType,
        competencyId: competencyId || null,
        content: content || null,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        notebookPageId: notebookPageId || null,
        drawingId: drawingId || null,
        isPublic: isPublic ?? false,
        tags: tags ? JSON.stringify(tags) : null,
        isDemo: isDemo ?? false,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        competency: {
          select: { id: true, code: true, title: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('PortfolioEntry POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
