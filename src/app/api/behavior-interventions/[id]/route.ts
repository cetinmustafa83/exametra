import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit, extractClientInfo } from '@/lib/audit';

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
    const intervention = await db.behaviorIntervention.findFirst({
      where: { id, deletedAt: null },
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

    if (!intervention) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // If not super admin, restrict to user's school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== intervention.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(intervention);
  } catch (error) {
    console.error('BehaviorIntervention GET [id] error:', error);
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

    const { id } = await params;
    const existing = await db.behaviorIntervention.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      type,
      description,
      status: interventionStatus,
      assignedTo,
      startDate,
      endDate,
      outcome,
      incidentId,
    } = body;

    const updated = await db.behaviorIntervention.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(interventionStatus !== undefined && { status: interventionStatus }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(outcome !== undefined && { outcome }),
        ...(incidentId !== undefined && { incidentId: incidentId || null }),
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
      schoolId: existing.schoolId,
      action: 'UPDATE',
      entityType: 'BehaviorIntervention',
      entityId: id,
      changes: { before: existing, after: updated },
      ...clientInfo,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('BehaviorIntervention PUT [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.behaviorIntervention.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.behaviorIntervention.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    const clientInfo = extractClientInfo(request);
    await logAudit({
      userId: session.user?.id,
      schoolId: existing.schoolId,
      action: 'DELETE',
      entityType: 'BehaviorIntervention',
      entityId: id,
      changes: { before: existing },
      ...clientInfo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BehaviorIntervention DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
