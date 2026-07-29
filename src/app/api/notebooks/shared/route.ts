import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── GET: Get public notebooks shared by other teachers in the same school ──
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      );
    }

    // Only show public notebooks from other teachers in the same school
    const sharedNotebooks = await db.notebook.findMany({
      where: {
        schoolId,
        isPublic: true,
        isArchived: false,
        deletedAt: null,
        ownerId: { not: session.user.id }, // Exclude own notebooks
      },
      include: {
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { pages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sharedNotebooks);
  } catch (error) {
    console.error('Shared notebooks get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
