import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit, extractClientInfo } from '@/lib/audit';
import { canAccessStudent } from '@/lib/access-policy';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const incidentId = searchParams.get('incidentId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // If not super admin, restrict to user's school
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
    if (incidentId) where.incidentId = incidentId;
    if (type) where.type = type;
    if (status) where.status = status;

    const interventions = await db.behaviorIntervention.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        incident: {
          select: { id: true, description: true, date: true, severity: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(interventions);
  } catch (error) {
    console.error('BehaviorIntervention GET error:', error);
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
      incidentId,
      type,
      description,
      status: interventionStatus,
      assignedTo,
      startDate,
      endDate,
      outcome,
      isDemo,
    } = body;

    if (!schoolId || !studentId || !type || !description) {
      return NextResponse.json(
        { error: 'schoolId, studentId, type, and description are required' },
        { status: 400 }
      );
    }
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.user?.role !== 'TEACHER' && session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user || !(await canAccessStudent(session.user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const intervention = await db.behaviorIntervention.create({
      data: {
        schoolId,
        studentId,
        incidentId: incidentId || null,
        type,
        description,
        status: interventionStatus || 'planned',
        assignedTo: assignedTo || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        outcome: outcome || null,
        isDemo: isDemo ?? false,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        incident: {
          select: { id: true, description: true, date: true, severity: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    const clientInfo = extractClientInfo(request);
    await logAudit({
      userId: session.user?.id,
      schoolId,
      action: 'CREATE',
      entityType: 'BehaviorIntervention',
      entityId: intervention.id,
      changes: { after: intervention },
      ...clientInfo,
    });

    return NextResponse.json(intervention, { status: 201 });
  } catch (error) {
    console.error('BehaviorIntervention POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
