import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessStudent } from '@/lib/access-policy';
import { isAdministrator } from '@/lib/role-access';

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
    const record = await db.healthRecord.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== record.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, record.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('HealthRecord GET [id] error:', error);
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
    const existing = await db.healthRecord.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      bloodType,
      allergies,
      medications,
      conditions,
      doctorName,
      doctorPhone,
      insuranceNumber,
      insuranceProvider,
      lastCheckup,
      notes,
      isConfidential,
    } = body;

    const updated = await db.healthRecord.update({
      where: { id },
      data: {
        ...(bloodType !== undefined && { bloodType: bloodType || null }),
        ...(allergies !== undefined && { allergies: allergies ? JSON.stringify(allergies) : null }),
        ...(medications !== undefined && { medications: medications ? JSON.stringify(medications) : null }),
        ...(conditions !== undefined && { conditions: conditions ? JSON.stringify(conditions) : null }),
        ...(doctorName !== undefined && { doctorName: doctorName || null }),
        ...(doctorPhone !== undefined && { doctorPhone: doctorPhone || null }),
        ...(insuranceNumber !== undefined && { insuranceNumber: insuranceNumber || null }),
        ...(insuranceProvider !== undefined && { insuranceProvider: insuranceProvider || null }),
        ...(lastCheckup !== undefined && { lastCheckup: lastCheckup ? new Date(lastCheckup) : null }),
        ...(notes !== undefined && { notes }),
        ...(isConfidential !== undefined && { isConfidential }),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('HealthRecord PUT [id] error:', error);
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

    const { id } = await params;
    const existing = await db.healthRecord.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== existing.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAdministrator(session.user?.role) || !session.user || !(await canAccessStudent(session.user, existing.studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.healthRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HealthRecord DELETE [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
