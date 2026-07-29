import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/districts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const district = await db.schoolDistrict.findFirst({
      where: { id, deletedAt: null },
      include: {
        schools: {
          select: {
            id: true,
            name: true,
            schoolType: true,
            country: true,
            _count: {
              select: { students: true, classGroups: true, users: true },
            },
          },
        },
      },
    });

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json(district);
  } catch (error) {
    console.error('[districts/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch district' }, { status: 500 });
  }
}

// PUT /api/districts/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, region, country, adminEmail, isActive } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code || null;
    if (region !== undefined) data.region = region || null;
    if (country !== undefined) data.country = country;
    if (adminEmail !== undefined) data.adminEmail = adminEmail || null;
    if (isActive !== undefined) data.isActive = isActive;

    const district = await db.schoolDistrict.update({
      where: { id },
      data,
      include: {
        schools: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(district);
  } catch (error) {
    console.error('[districts/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update district' }, { status: 500 });
  }
}

// DELETE /api/districts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Remove district from schools first
    await db.school.updateMany({
      where: { districtId: id },
      data: { districtId: null },
    });

    await db.schoolDistrict.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[districts/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete district' }, { status: 500 });
  }
}
