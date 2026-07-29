import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/districts
export async function GET() {
  try {
    const districts = await db.schoolDistrict.findMany({
      where: { deletedAt: null },
      include: {
        schools: {
          where: { deletedAt: null },
          select: { id: true, name: true, schoolType: true, country: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Add computed stats
    const result = districts.map((d) => ({
      ...d,
      schoolCount: d.schools.length,
      totalStudents: 0, // Would need aggregation query in production
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[districts] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 500 });
  }
}

// POST /api/districts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, region, country, adminEmail } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const district = await db.schoolDistrict.create({
      data: {
        name,
        code: code || null,
        region: region || null,
        country: country || 'DE',
        adminEmail: adminEmail || null,
      },
      include: {
        schools: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(district, { status: 201 });
  } catch (error) {
    console.error('[districts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create district' }, { status: 500 });
  }
}
