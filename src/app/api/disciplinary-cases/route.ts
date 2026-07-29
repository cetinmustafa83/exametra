import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId;
    const status = searchParams.get('status');
    const committeeId = searchParams.get('committeeId');

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const role = session.user?.role;
    const userId = session.userId;

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;
    if (committeeId) where.committeeId = committeeId;

    // TEACHER: see cases they reported OR cases in their committee
    if (role === 'TEACHER') {
      const memberOf = await db.disciplinaryCommitteeMember.findMany({
        where: { userId },
        select: { committeeId: true },
      });
      const committeeIds = memberOf.map((m) => m.committeeId);

      if (committeeIds.length > 0) {
        where.OR = [
          { reportedBy: userId },
          { committeeId: { in: committeeIds } },
        ];
      } else {
        where.reportedBy = userId;
      }
    }
    // ADMIN, VICE_PRINCIPAL, SUPER_ADMIN see all

    const cases = await db.disciplinaryCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        committee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('DisciplinaryCases GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'TEACHER' && role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'VICE_PRINCIPAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, committeeId, studentId, caseType, description, evidence } = body;

    if (!schoolId || !committeeId || !studentId || !caseType || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newCase = await db.disciplinaryCase.create({
      data: {
        schoolId,
        committeeId,
        studentId,
        reportedBy: session.userId,
        caseType,
        description,
        evidence: evidence || null,
        status: 'open',
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        committee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('DisciplinaryCases POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
