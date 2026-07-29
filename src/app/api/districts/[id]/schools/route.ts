import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/districts/[id]/schools — schools in district
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const district = await db.schoolDistrict.findFirst({
      where: { id, deletedAt: null },
    });

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    const schools = await db.school.findMany({
      where: { districtId: id },
      include: {
        _count: {
          select: { students: true, classGroups: true, users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('[districts/[id]/schools] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch district schools' }, { status: 500 });
  }
}

// POST /api/districts/[id]/schools — assign school to district
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { schoolId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    await db.school.update({
      where: { id: schoolId },
      data: { districtId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[districts/[id]/schools] POST error:', error);
    return NextResponse.json({ error: 'Failed to assign school to district' }, { status: 500 });
  }
}
