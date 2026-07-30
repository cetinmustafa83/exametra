import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/substitutes - List substitute teachers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      deletedAt: null,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const substitutes = await db.substituteTeacher.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          where: { status: { in: ['pending', 'confirmed'] } },
          select: { id: true, date: true, status: true },
          orderBy: { date: 'asc' },
          take: 5,
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json(substitutes);
  } catch (error) {
    console.error('Error fetching substitutes:', error);
    return NextResponse.json({ error: 'Failed to fetch substitutes' }, { status: 500 });
  }
}

// POST /api/substitutes - Create a substitute teacher
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId, userId, firstName, lastName, email, phone,
      qualifications, subjects, gradeLevels, availability,
      maxDaysPerWeek, notes, isActive,
    } = body;

    if (!schoolId || !firstName || !lastName) {
      return NextResponse.json({ error: 'schoolId, firstName, and lastName are required' }, { status: 400 });
    }

    const substitute = await db.substituteTeacher.create({
      data: {
        schoolId,
        userId: userId || null,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        qualifications: qualifications ? JSON.stringify(qualifications) : null,
        subjects: subjects ? JSON.stringify(subjects) : null,
        gradeLevels: gradeLevels ? JSON.stringify(gradeLevels) : null,
        availability: availability ? JSON.stringify(availability) : null,
        maxDaysPerWeek: maxDaysPerWeek ?? 5,
        notes: notes || null,
        isActive: isActive ?? true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(substitute, { status: 201 });
  } catch (error) {
    console.error('Error creating substitute:', error);
    return NextResponse.json({ error: 'Failed to create substitute' }, { status: 500 });
  }
}
