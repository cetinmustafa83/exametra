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
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

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

    if (studentId) where.studentId = studentId;

    const contacts = await db.emergencyContact.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('EmergencyContact GET error:', error);
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
      name,
      relationship,
      phone,
      phoneAlt,
      email,
      address,
      isPrimary,
      priority,
      notes,
      isDemo,
    } = body;

    if (!schoolId || !studentId || !name || !relationship || !phone) {
      return NextResponse.json(
        { error: 'schoolId, studentId, name, relationship, and phone are required' },
        { status: 400 }
      );
    }

    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contact = await db.emergencyContact.create({
      data: {
        schoolId,
        studentId,
        name,
        relationship,
        phone,
        phoneAlt: phoneAlt || null,
        email: email || null,
        address: address || null,
        isPrimary: isPrimary ?? false,
        priority: priority ?? 1,
        notes: notes || null,
        isDemo: isDemo ?? false,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('EmergencyContact POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
